const rawApiBaseUrl =
  process.env.NEXT_PUBLIC_CBT_API_BASE_URL || "http://127.0.0.1:8000";

export const CBT_API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");
export const CBT_TOKEN_COOKIE = "cbt_auth_token";
