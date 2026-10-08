import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { server } from "@/test/server";
import { CSRF_HEADER } from "@/types/types";

import { api, resetRotateLock, setTestBaseUrl } from "./client";
import { setCsrfToken } from "./csrf";

const API_ORIGIN = "http://localhost";

describe("shared token rotate", () => {
  beforeEach(() => {
    setTestBaseUrl(API_ORIGIN);
    resetRotateLock();
    setCsrfToken("test-csrf-token");
    localStorage.setItem("device_fingerprint", "test-fingerprint");
  });

  afterEach(() => {
    resetRotateLock();
    setCsrfToken(null);
  });

  it("runs a single rotate for two parallel 401 responses, then retries succeed", async () => {
    let protectedHits = 0;
    let rotateHits = 0;

    server.use(
      http.get(`${API_ORIGIN}/v1/protected`, () => {
        protectedHits += 1;

        // First wave: both parallel calls get 401.
        // Second wave: retries after shared rotate succeed.
        if (protectedHits <= 2) {
          return HttpResponse.json(
            { error: { type: "unauthorized", message: "Unauthenticated" } },
            { status: 401 },
          );
        }

        return HttpResponse.json({ ok: true });
      }),
      http.post(`${API_ORIGIN}/auth/token/rotate`, async ({ request }) => {
        rotateHits += 1;

        expect(request.headers.get(CSRF_HEADER)).toBe("test-csrf-token");
        const body = (await request.json()) as { fingerprint?: string };
        expect(body.fingerprint).toBe("test-fingerprint");

        // Keep rotate in-flight briefly so both 401 handlers share one promise.
        await new Promise((resolve) => setTimeout(resolve, 30));

        return new HttpResponse(null, { status: 200 });
      }),
    );

    const [first, second] = await Promise.all([
      api.get<{ ok: boolean }>("/v1/protected"),
      api.get<{ ok: boolean }>("/v1/protected"),
    ]);

    expect(first.data).toEqual({ ok: true });
    expect(second.data).toEqual({ ok: true });
    expect(rotateHits).toBe(1);
    expect(protectedHits).toBe(4);
  });
});
