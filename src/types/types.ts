// GET /csrf → 204, header X-CSRF-TOKEN
export const CSRF_HEADER = "X-CSRF-TOKEN" as const;

// POST /auth/login
export interface LoginRequest {
  email: string;
  password: string;
  fingerprint: string;
}

export interface LoginResponse {
  device_session_token: string;
}

// POST /auth/token/issue
export interface TokenIssueRequest {
  device_session_token: string;
  fingerprint: string;
}

export interface TokenIssueResponse {
  device_session_token: string;
}

// POST /auth/token/rotate | POST /auth/token/revoke
export interface FingerprintRequest {
  fingerprint: string;
}

// GET /v1/me
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
}

// GET /v1/webhooks | GET /v1/webhooks/{id} | PUT /v1/webhooks/{id}
export interface Webhook {
  id: string;
  name: string;
  url: string;
  active: boolean;
  created_at: string;
}

export interface WebhookList {
  data: Webhook[];
  paging: {
    pages: {
      current: number;
      last: number;
    };
    results: {
      total: number;
      limitation: number;
    };
  };
}

export interface WebhookListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface WebhookUpdateRequest {
  name: string;
  url: string;
}

export interface ApiError {
  error: {
    type: string;
    message: string;
    payload?: Record<string, string[]>;
  };
}

export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  TOKEN_MISMATCH: 419,
  VALIDATION_ERROR: 422,
} as const;
