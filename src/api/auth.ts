import { api, ensureCsrf } from "./client";
import type { LoginRequest, LoginResponse, TokenIssueRequest, User } from "@/types/types";
import { useAuthStore } from "@/stores/authStore";
import { getFingerprint } from "@/lib/fingerprint";

export async function ensureAuth(): Promise<void> {
  await ensureCsrf();
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const { setDeviceSessionToken } = useAuthStore.getState();
  const response = await api.post<LoginResponse>("/auth/login", request);
  const sessionToken = response.data.device_session_token;
  if (sessionToken) {
    setDeviceSessionToken(sessionToken);
  } else {
    throw new Error("No device session token found");
  }
  return response.data;
}

export async function fetchMe(): Promise<User> {
  const { setUser } = useAuthStore.getState();
  const response = await api.get<User>("/v1/me");
  setUser(response.data);
  return response.data;
}

export async function logoutUser(): Promise<void> {
  const { logout } = useAuthStore.getState();
  const fingerprint = getFingerprint();
  try{
    await api.post("/auth/token/revoke", {fingerprint});
  } catch (error) {
    console.error(error);
  } finally {
    logout();
  }
}

export async function issueToken( request: TokenIssueRequest): Promise<void> {
  const { clearDeviceSessionToken } = useAuthStore.getState();
  await api.post("/auth/token/issue", request);
  clearDeviceSessionToken(); 
}