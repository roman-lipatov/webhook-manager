import { CSRF_HEADER } from "@/types/types";

/** In-memory CSRF token — not in Zustand (axios needs it, UI does not). */
let csrfToken: string | null = null;

export function getCsrfToken(): string | null {
  return csrfToken;
}

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

/** Axios lowercases response header names in the browser. */
export function readCsrfHeader(
  headers: Record<string, unknown> | undefined,
): string | null {
  if (!headers) {
    return null;
  }

  const value = headers["x-csrf-token"] ?? headers[CSRF_HEADER.toLowerCase()];

  return typeof value === "string" && value.length > 0 ? value : null;
}
