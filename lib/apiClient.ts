import { CBT_API_BASE_URL, CBT_TOKEN_COOKIE } from "@/lib/config";
import { getCookie } from "@/lib/cookies";

type ApiFetchOptions = RequestInit & {
  skipAuth?: boolean;
  authScope?: string;
};

type ApiErrorPayload = {
  message?: string;
  errors?: Record<string, string[]>;
  linked?: LinkedItem[];
};

export type LinkedItem = {
  label: string;
  count: number;
  unlinkable: boolean;
};

export class ApiLinkedError extends Error {
  linked: LinkedItem[];
  constructor(message: string, linked: LinkedItem[]) {
    super(message);
    this.linked = linked;
  }
}

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${CBT_API_BASE_URL}${normalizedPath}`;
}

function resolveErrorMessage(payload: ApiErrorPayload, fallback: string): string {
  if (payload.message) {
    return payload.message;
  }

  const firstError = payload.errors ? Object.values(payload.errors)[0]?.[0] : null;
  return firstError || fallback;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { skipAuth, headers, body, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);

  requestHeaders.set("Accept", "application/json");

  if (body && !(body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (!skipAuth) {
    const token = getCookie(CBT_TOKEN_COOKIE);
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(buildUrl(path), {
    ...requestOptions,
    body,
    headers: requestHeaders,
  });

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    if (typeof payload === "object" && payload !== null && Array.isArray((payload as ApiErrorPayload).linked)) {
      const p = payload as ApiErrorPayload;
      throw new ApiLinkedError(p.message ?? `Request failed (${response.status})`, p.linked!);
    }

    const message =
      typeof payload === "string"
        ? payload || `Request failed with status ${response.status}`
        : resolveErrorMessage(payload, `Request failed with status ${response.status}`);

    throw new Error(message);
  }

  return payload as T;
}
