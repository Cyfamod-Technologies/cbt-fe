const COOKIE_PATH = "/";

function isBrowser(): boolean {
  return typeof document !== "undefined";
}

export function getCookie(name: string): string | null {
  if (!isBrowser()) {
    return null;
  }

  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.split("=").slice(1).join("="));
}

export function setCookie(
  name: string,
  value: string,
  maxAgeSeconds = 60 * 60 * 24 * 7,
): void {
  if (!isBrowser()) {
    return;
  }

  const expires = new Date(Date.now() + maxAgeSeconds * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=${COOKIE_PATH}; SameSite=Lax`;
}

export function deleteCookie(name: string): void {
  if (!isBrowser()) {
    return;
  }

  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${COOKIE_PATH}; SameSite=Lax`;
}