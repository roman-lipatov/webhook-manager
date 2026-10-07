import type { User, Webhook } from "@/types/types";

/** Demo credentials for the mock API. */
export const DEMO_EMAIL = "admin@example.com";
export const DEMO_PASSWORD = "password1";

export const demoUser: User = {
  id: "user_1",
  email: DEMO_EMAIL,
  first_name: "Ada",
  last_name: "Lovelace",
  name: "Ada Lovelace",
};

const SESSION_TTL_MS = 30_000;
const SESSION_COOKIE = "wm_session";

export type Session = {
  id: string;
  fingerprint: string;
  expiresAt: number;
};

export type PendingDeviceSession = {
  token: string;
  fingerprint: string;
};

/** Mutable in-memory store — resets on full page reload. */
export const db = {
  csrfToken: null as string | null,
  pendingDeviceSession: null as PendingDeviceSession | null,
  session: null as Session | null,
  webhooks: [
    {
      id: "wh_1",
      name: "Order created",
      url: "https://example.com/hooks/orders",
      active: true,
      created_at: "2026-01-10T10:00:00.000Z",
    },
    {
      id: "wh_2",
      name: "Payment failed",
      url: "https://example.com/hooks/payments",
      active: true,
      created_at: "2026-01-12T14:30:00.000Z",
    },
    {
      id: "wh_3",
      name: "User signed up",
      url: "https://hooks.example.org/signup",
      active: false,
      created_at: "2026-02-01T09:15:00.000Z",
    },
    {
      id: "wh_4",
      name: "Invoice paid",
      url: "https://billing.example.com/webhooks",
      active: true,
      created_at: "2026-02-20T18:00:00.000Z",
    },
    {
      id: "wh_5",
      name: "Subscription canceled",
      url: "https://example.com/hooks/subscriptions",
      active: true,
      created_at: "2026-03-05T11:45:00.000Z",
    },
  ] satisfies Webhook[],
};

export function issueCsrfToken(): string {
  const token = crypto.randomUUID().replace(/-/g, "");
  db.csrfToken = token;
  return token;
}

export function createDeviceSessionToken(fingerprint: string): string {
  const token = crypto.randomUUID().replace(/-/g, "");
  db.pendingDeviceSession = { token, fingerprint };
  return token;
}

export function startSession(fingerprint: string): Session {
  const session: Session = {
    id: crypto.randomUUID().replace(/-/g, ""),
    fingerprint,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  db.session = session;
  db.pendingDeviceSession = null;
  return session;
}

export function rotateSession(fingerprint: string): Session | null {
  if (db.session === null || db.session.fingerprint !== fingerprint) {
    return null;
  }

  db.session = {
    ...db.session,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };

  return db.session;
}

export function clearSession(): void {
  db.session = null;
  db.pendingDeviceSession = null;
}

export function isSessionValid(now = Date.now()): boolean {
  return db.session !== null && db.session.expiresAt > now;
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export function buildSessionCookie(sessionId: string): string {
  const maxAge = Math.ceil(SESSION_TTL_MS / 1000);
  return `${SESSION_COOKIE}=${sessionId}; Path=/; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0`;
}

export function readSessionIdFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));

  if (!match) {
    return null;
  }

  const value = match.slice(SESSION_COOKIE.length + 1);
  return value.length > 0 ? value : null;
}

export function findWebhook(id: string): Webhook | undefined {
  return db.webhooks.find((webhook) => webhook.id === id);
}
