import { apiFetch } from "@/lib/apiClient";
import { CBT_TOKEN_COOKIE } from "@/lib/config";
import { deleteCookie, setCookie } from "@/lib/cookies";

export interface LoginPayload {
  school_code: string;
  email: string;
  password: string;
}

export interface CbtCapabilities {
  manage_schools: boolean;
  manage_catalog: boolean;
  manage_users: boolean;
  manage_questions: boolean;
  manage_assessments: boolean;
  take_exams: boolean;
}

export interface CbtUser {
  id: number;
  school_id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  department_id?: number | null;
  department?: { id: number; name: string } | null;
  capabilities: CbtCapabilities;
  [key: string]: unknown;
}

export interface LoginResponse {
  token: string;
  user: CbtUser;
}

export interface CurrentUserResponse {
  user: CbtUser;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await apiFetch<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuth: true,
  });

  if (response.token) {
    setCookie(CBT_TOKEN_COOKIE, response.token);
  }

  return response;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch("/api/v1/auth/logout", { method: "POST" });
  } catch {
    // Ignore logout errors and clear the local token anyway.
  } finally {
    deleteCookie(CBT_TOKEN_COOKIE);
  }
}

export async function getAuthenticatedUser(): Promise<CbtUser | null> {
  try {
    const response = await apiFetch<CurrentUserResponse>("/api/v1/me");
    return response.user ?? null;
  } catch {
    return null;
  }
}
