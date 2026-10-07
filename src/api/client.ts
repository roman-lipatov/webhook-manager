import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

import { getFingerprint } from "@/lib/fingerprint";
import { useAuthStore } from "@/stores/authStore";
import { CSRF_HEADER, HTTP_STATUS, type User } from "@/types/types";

import { getCsrfToken, readCsrfHeader, setCsrfToken } from "./csrf";

type RetryConfig = InternalAxiosRequestConfig & {
  _authRetry?: boolean;
  _csrfRetry?: boolean;
  _skipAuthRetry?: boolean;
};

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "";

const refreshClient: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
  },
});

export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
  },
});

/** GET /v1/me; skipAuthRetry = no rotate on 401 (bootstrap). */
export function getMe(skipAuthRetry = false) {
  const config = skipAuthRetry
    ? ({ _skipAuthRetry: true } as RetryConfig)
    : undefined;

  return api.get<User>("/v1/me", config);
}

export async function ensureCsrf(): Promise<string> {
  const response = await refreshClient.get("/csrf");
  const token = readCsrfHeader(response.headers);

  if (token === null) {
    throw new Error("CSRF token missing from /csrf response");
  }

  setCsrfToken(token);
  return token;
}

let rotatePromise: Promise<void> | null = null;

async function requestRotate(): Promise<void> {
  const token = getCsrfToken() ?? (await ensureCsrf());

  await refreshClient.post(
    "/auth/token/rotate",
    { fingerprint: getFingerprint() },
    { headers: { [CSRF_HEADER]: token } },
  );
}

/** One in-flight rotate shared by parallel 401s. */
function rotateSession(): Promise<void> {
  if (rotatePromise !== null) {
    return rotatePromise;
  }

  rotatePromise = requestRotate().finally(() => {
    rotatePromise = null;
  });

  return rotatePromise;
}

api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();
  const csrfToken = getCsrfToken();

  if ((method === "POST" || method === "PUT") && csrfToken !== null) {
    config.headers.set(CSRF_HEADER, getCsrfToken());
  }

  return config;
});

async function retryUnauthorized(
  error: AxiosError,
  config: RetryConfig,
) {
  if (config._skipAuthRetry) {
    return Promise.reject(error);
  }

  // Already retried once after rotate → session is dead
  if (config._authRetry) {
    useAuthStore.getState().logout();
    return Promise.reject(error);
  }

  try {
    await rotateSession();
    config._authRetry = true;
    return api.request(config);
  } catch {
    useAuthStore.getState().logout();
    return Promise.reject(error);
  }
}

async function retryCsrfMismatch(
  error: AxiosError,
  config: RetryConfig,
) {
  // Already refreshed CSRF once → give up
  if (config._csrfRetry) {
    return Promise.reject(error);
  }

  try {
    await ensureCsrf();
    config._csrfRetry = true;
    return api.request(config);
  } catch {
    return Promise.reject(error);
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    if (config === undefined || status === undefined) {
      return Promise.reject(error);
    }

    if (status === HTTP_STATUS.UNAUTHORIZED) {
      return retryUnauthorized(error, config);
    }

    if (status === HTTP_STATUS.TOKEN_MISMATCH) {
      return retryCsrfMismatch(error, config);
    }

    return Promise.reject(error);
  },
);
