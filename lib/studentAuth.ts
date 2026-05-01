"use client";

import { CBT_API_BASE_URL } from "@/lib/config";
import { getCookie, setCookie, deleteCookie } from "@/lib/cookies";

export const CBT_STUDENT_COOKIE = "cbt_student_token";

export interface StudentUser {
  id: number;
  name: string;
  matric_no: string | null;
  department_id: number | null;
  level_id: number | null;
  department?: { id: number; name: string } | null;
  level?: { id: number; name: string } | null;
}

function buildUrl(path: string): string {
  return path.startsWith("http") ? path : `${CBT_API_BASE_URL}${path}`;
}

export async function studentFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getCookie(CBT_STUDENT_COOKIE);
  const headers = new Headers(options.headers as HeadersInit | undefined);
  headers.set("Accept", "application/json");
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), { ...options, headers });

  if (response.status === 204) return {} as T;

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { message?: string }).message || `Request failed (${response.status})`);
  }
  return payload as T;
}

export async function studentAccess(payload: {
  school_code: string;
  matric_no: string;
  name: string;
}): Promise<StudentUser> {
  const response = await fetch(buildUrl("/api/v1/auth/student-access"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { message?: string }).message || "Login failed.");
  }

  const { token, user } = data as { token: string; user: StudentUser };
  setCookie(CBT_STUDENT_COOKIE, token);
  return user;
}

export async function getStudentProfile(): Promise<StudentUser | null> {
  const token = getCookie(CBT_STUDENT_COOKIE);
  if (!token) return null;
  try {
    const data = await studentFetch<{ user: StudentUser }>("/api/v1/me");
    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function studentLogout(): Promise<void> {
  deleteCookie(CBT_STUDENT_COOKIE);
}
