import { http, HttpResponse } from "msw";

import {
  CSRF_HEADER,
  HTTP_STATUS,
  type ApiError,
  type FingerprintRequest,
  type LoginRequest,
  type TokenIssueRequest,
  type WebhookUpdateRequest,
} from "@/types/types";

import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  buildSessionCookie,
  clearSession,
  clearSessionCookie,
  createDeviceSessionToken,
  db,
  demoUser,
  findWebhook,
  isSessionValid,
  issueCsrfToken,
  readSessionIdFromCookie,
  rotateSession,
  startSession,
} from "./db";

function apiError(
  status: number,
  type: string,
  message: string,
  payload?: Record<string, string[]>,
) {
  const body: ApiError = {
    error: { type, message, ...(payload ? { payload } : {}) },
  };
  return HttpResponse.json(body, { status });
}

function readCsrf(request: Request): string | null {
  return request.headers.get(CSRF_HEADER) ?? request.headers.get("x-csrf-token");
}

/** POST/PUT must send the current CSRF token. */
function assertCsrf(request: Request) {
  const sent = readCsrf(request);
  if (db.csrfToken === null || sent !== db.csrfToken) {
    return apiError(
      HTTP_STATUS.TOKEN_MISMATCH,
      "token_mismatch",
      "CSRF token mismatch",
    );
  }
  return null;
}

/**
 * Protected /v1 routes need a valid in-memory session.
 * Cookie is checked when the browser actually sends it.
 * MSW Service Worker responses often do not persist Set-Cookie into
 * document.cookie, so a missing Cookie header alone is not 401.
 */
function assertSession(request: Request) {
  if (!isSessionValid() || db.session === null) {
    return apiError(
      HTTP_STATUS.UNAUTHORIZED,
      "unauthorized",
      "Unauthenticated",
    );
  }

  const sessionId = readSessionIdFromCookie(request.headers.get("cookie"));

  if (sessionId !== null && sessionId !== db.session.id) {
    return apiError(
      HTTP_STATUS.UNAUTHORIZED,
      "unauthorized",
      "Unauthenticated",
    );
  }

  return null;
}

/**
 * Handlers mirror the API contract.
 * Order rarely matters — MSW matches method + path.
 */
export const handlers = [
  // GET /csrf → 204 + X-CSRF-TOKEN
  http.get("/csrf", () => {
    const token = issueCsrfToken();
    return new HttpResponse(null, {
      status: 204,
      headers: { [CSRF_HEADER]: token },
    });
  }),

  // POST /auth/login → { device_session_token } | 422
  http.post("/auth/login", async ({ request }) => {
    const csrfError = assertCsrf(request);
    if (csrfError) {
      return csrfError;
    }

    const body = (await request.json()) as LoginRequest;

    if (!body.email || !body.password || !body.fingerprint) {
      return apiError(
        HTTP_STATUS.VALIDATION_ERROR,
        "validation_error",
        "Validation failed",
        {
          ...(body.email ? {} : { email: ["Email is required"] }),
          ...(body.password ? {} : { password: ["Password is required"] }),
          ...(body.fingerprint ? {} : { fingerprint: ["Fingerprint is required"] }),
        },
      );
    }

    if (body.email !== DEMO_EMAIL || body.password !== DEMO_PASSWORD) {
      return apiError(
        HTTP_STATUS.VALIDATION_ERROR,
        "validation_error",
        "Invalid credentials",
        { email: ["These credentials do not match our records."] },
      );
    }

    const device_session_token = createDeviceSessionToken(body.fingerprint);
    return HttpResponse.json({ device_session_token });
  }),

  // POST /auth/token/issue → 200 (cookie session) | 422
  http.post("/auth/token/issue", async ({ request }) => {
    const csrfError = assertCsrf(request);
    if (csrfError) {
      return csrfError;
    }

    const body = (await request.json()) as TokenIssueRequest;
    const pending = db.pendingDeviceSession;

    if (
      pending === null ||
      body.device_session_token !== pending.token ||
      body.fingerprint !== pending.fingerprint
    ) {
      return apiError(
        HTTP_STATUS.VALIDATION_ERROR,
        "validation_error",
        "Invalid device session token",
      );
    }

    const session = startSession(body.fingerprint);

    return new HttpResponse(null, {
      status: 200,
      headers: {
        "Set-Cookie": buildSessionCookie(session.id),
      },
    });
  }),

  // POST /auth/token/rotate → 200 | 400
  http.post("/auth/token/rotate", async ({ request }) => {
    const csrfError = assertCsrf(request);
    if (csrfError) {
      return csrfError;
    }

    const body = (await request.json()) as FingerprintRequest;
    const session = rotateSession(body.fingerprint);

    if (session === null) {
      return apiError(
        HTTP_STATUS.BAD_REQUEST,
        "bad_request",
        "Unable to rotate token",
      );
    }

    return new HttpResponse(null, {
      status: 200,
      headers: {
        "Set-Cookie": buildSessionCookie(session.id),
      },
    });
  }),

  // POST /auth/token/revoke → 204
  http.post("/auth/token/revoke", async ({ request }) => {
    const csrfError = assertCsrf(request);
    if (csrfError) {
      return csrfError;
    }

    clearSession();

    return new HttpResponse(null, {
      status: 204,
      headers: {
        "Set-Cookie": clearSessionCookie(),
      },
    });
  }),

  // GET /v1/me → User | 401
  http.get("/v1/me", ({ request }) => {
    const sessionError = assertSession(request);
    if (sessionError) {
      return sessionError;
    }

    return HttpResponse.json(demoUser);
  }),

  // GET /v1/webhooks?page&limit&search → WebhookList | 401
  http.get("/v1/webhooks", ({ request }) => {
    const sessionError = assertSession(request);
    if (sessionError) {
      return sessionError;
    }

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const limit = Math.max(1, Number(url.searchParams.get("limit") ?? 10));
    const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();

    const filtered = search
      ? db.webhooks.filter(
          (webhook) =>
            webhook.name.toLowerCase().includes(search) ||
            webhook.url.toLowerCase().includes(search),
        )
      : db.webhooks;

    const total = filtered.length;
    const last = Math.max(1, Math.ceil(total / limit));
    const current = Math.min(page, last);
    const start = (current - 1) * limit;
    const data = filtered.slice(start, start + limit);

    return HttpResponse.json({
      data,
      paging: {
        pages: { current, last },
        results: { total, limitation: limit },
      },
    });
  }),

  // GET /v1/webhooks/:id → Webhook | 401 | 404
  http.get("/v1/webhooks/:id", ({ request, params }) => {
    const sessionError = assertSession(request);
    if (sessionError) {
      return sessionError;
    }

    const webhook = findWebhook(String(params.id));
    if (!webhook) {
      return apiError(HTTP_STATUS.NOT_FOUND, "not_found", "Webhook not found");
    }

    return HttpResponse.json(webhook);
  }),

  // PUT /v1/webhooks/:id → Webhook | 401 | 422
  http.put("/v1/webhooks/:id", async ({ request, params }) => {
    const sessionError = assertSession(request);
    if (sessionError) {
      return sessionError;
    }

    const csrfError = assertCsrf(request);
    if (csrfError) {
      return csrfError;
    }

    const webhook = findWebhook(String(params.id));
    if (!webhook) {
      return apiError(HTTP_STATUS.NOT_FOUND, "not_found", "Webhook not found");
    }

    const body = (await request.json()) as WebhookUpdateRequest;
    const payload: Record<string, string[]> = {};

    if (!body.name?.trim()) {
      payload.name = ["Name is required"];
    }
    if (!body.url?.trim()) {
      payload.url = ["URL is required"];
    } else {
      try {
        new URL(body.url);
      } catch {
        payload.url = ["URL must be valid"];
      }
    }

    if (Object.keys(payload).length > 0) {
      return apiError(
        HTTP_STATUS.VALIDATION_ERROR,
        "validation_error",
        "Validation failed",
        payload,
      );
    }

    webhook.name = body.name.trim();
    webhook.url = body.url.trim();

    return HttpResponse.json(webhook);
  }),
];
