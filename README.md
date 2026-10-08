# Webhook Manager

Smart Sender: a React + TypeScript app for authentication and webhook management, with an MSW-mocked API.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Tests

```bash
npm test
```

Required scenario: **two parallel `401` responses → a single `POST /auth/token/rotate` → successful retries**.

## Demo credentials (MSW)

| Field | Value |
|---|---|
| Email | `admin@example.com` |
| Password | `password1` |

The mock session lasts **~30 seconds**. After that, protected requests return `401` and the client rotates the token (or logs out if rotate fails).

## Features

- Auth flow: `GET /csrf` → `POST /auth/login` → `POST /auth/token/issue` → `GET /v1/me`
- CSRF header on `POST` / `PUT`; CSRF refresh on `419`
- Shared rotate on `401` (one in-flight promise for parallel requests)
- Webhook list with `page` / `search` / `limit` in the URL
- Edit modal with react-hook-form + zod and field-level `422` errors
- In-memory MSW API

## Architecture notes

1. **`api/client.ts`** — axios instance with interceptors (CSRF, `401` rotate, `419`). A separate `refreshClient` has no retry interceptors so rotate/CSRF calls cannot recurse.
2. **Zustand `authStore`** — UI/auth state only (`user`, temporary `device_session_token`). CSRF and fingerprint stay outside the store.
3. **TanStack Query** — server state for webhooks; query keys and mutations live in `hooks/useWebhooks.ts`.
4. **URL as source of truth** for pagination and search (`useSearchParams`).
5. **MSW** stands in for the backend; mock session is also mirrored to `sessionStorage` because browsers often do not persist `Set-Cookie` from Service Worker responses.
