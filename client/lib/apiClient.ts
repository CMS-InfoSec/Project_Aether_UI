// Centralized API client for backend requests
// - Reads base URL override from localStorage ('aether-backend-url')
// - Attaches Authorization: Bearer <access_token> (from localStorage)
// - Adds X-API-Key for admin/system endpoints or when admin flag is set
// - Automatically attempts token refresh via a refresher registered by AuthProvider on 401/419 responses
// - Retries the original request once after a successful refresh

export type ApiFetchInit = RequestInit & {
  admin?: boolean;
  noAuth?: boolean;
  _retried?: boolean;
};

let tokenRefresher: null | (() => Promise<boolean>) = null;

export function setTokenRefresher(fn: () => Promise<boolean>) {
  tokenRefresher = fn;
}

export function getBaseUrl(): string {
  if (typeof window === "undefined") return "";
  const saved = localStorage.getItem("aether-backend-url");
  return (
    saved && saved.trim().length > 0 ? saved : window.location.origin
  ).replace(/\/$/, "");
}

export function getWsUrl(path?: string): string {
  if (typeof window === "undefined") return "";
  const saved = localStorage.getItem("aether-ws-url");
  if (saved && saved.trim()) return saved.replace(/\/$/, "") + (path || "");
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const base = `${proto}://${window.location.host}`;
  return base + (path || "");
}

function shouldAddAdminKey(url: string, init?: ApiFetchInit): boolean {
  if (init && init.admin) return true;
  try {
    const u = new URL(url);
    // Admin-like namespaces
    return /\/api\/(admin|system|governance|automation)\b/.test(u.pathname);
  } catch {
    return false;
  }
}

export async function apiFetch(
  input: string | URL | Request,
  init?: ApiFetchInit,
): Promise<Response> {
  const base = getBaseUrl();

  // Build URL
  let urlStr: string;
  if (typeof input === "string") {
    urlStr = input.startsWith("http")
      ? input
      : `${base}${input.startsWith("/") ? "" : "/"}${input}`;
  } else if (input instanceof URL) {
    urlStr = input.toString();
  } else {
    urlStr = input.url;
  }

  // Prepare headers
  const headers = new Headers(
    init?.headers ||
      (typeof input !== "string" && "headers" in input
        ? (input as Request).headers
        : undefined),
  );

  // Attach Authorization unless disabled
  const access =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  if (!init?.noAuth && access && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${access}`);
  }

  // Add admin key when needed
  if (shouldAddAdminKey(urlStr, init) && !headers.has("X-API-Key")) {
    headers.set("X-API-Key", "aether-admin-key-2024");
  }

  const xhrFetch = (url: string, init?: ApiFetchInit): Promise<Response> => {
    return new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        const method = (init && init.method) || "GET";
        xhr.open(method, url, true);

        // Set timeout (15s)
        xhr.timeout = 15000;

        // Set headers
        const hdrs = new Headers(init?.headers as HeadersInit || headers);
        hdrs.forEach((value, key) => xhr.setRequestHeader(key, value));

        if (init && init.credentials === "include") {
          xhr.withCredentials = true;
        }

        xhr.responseType = "blob";

        xhr.onload = () => {
          const status = xhr.status === 1223 ? 204 : xhr.status; // IE quirk
          const statusText = xhr.statusText || "";
          const responseHeaders = xhr.getAllResponseHeaders();

          // Convert header string to Headers
          const headerPairs = responseHeaders.trim().split(/\r?\n/);
          const resHeaders = new Headers();
          headerPairs.forEach((line) => {
            const parts = line.split(": ");
            const key = parts.shift();
            const value = parts.join(": ");
            if (key) resHeaders.append(key, value);
          });

          const body = xhr.response instanceof Blob ? xhr.response : new Blob([xhr.response]);
          const response = new Response(body, {
            status,
            statusText,
            headers: resHeaders,
          });
          resolve(response);
        };

        xhr.onerror = () => reject(new TypeError("Network request failed"));
        xhr.ontimeout = () => reject(new TypeError("Network request timed out"));

        // Send body
        if (init && init.body) {
          // If body is a string or blob or FormData, send directly
          xhr.send(init.body as any);
        } else {
          xhr.send();
        }
      } catch (err) {
        reject(err);
      }
    });
  };

  const doFetch = async (): Promise<Response> => {
    // First try native fetch; if it throws or rejects, fallback to XHR
    try {
      const f = (typeof window !== "undefined" && (window as any).fetch) || fetch;
      return await f(urlStr, { ...init, headers });
    } catch (err) {
      // Fallback to XHR for environments where fetch is patched or unreliable
      return await xhrFetch(urlStr, init);
    }
  };

  let res: Response;
  try {
    res = await doFetch();
  } catch (err) {
    // Last-ditch attempt using XHR directly if fetch and first fallback failed
    try {
      res = await xhrFetch(urlStr, init);
    } catch (err2) {
      // Re-throw original error with more context
      throw err2;
    }
  }

  // Attempt refresh on 401/419 once
  if ((res.status === 401 || res.status === 419) && !init?._retried) {
    // Avoid recursive refresh for refresh endpoint itself
    const isRefreshCall = /\/api\/auth\/refresh\b/.test(urlStr);
    if (!isRefreshCall && typeof tokenRefresher === "function") {
      try {
        const ok = await tokenRefresher();
        if (ok) {
          // Update Authorization header with the latest token
          const newAccess =
            typeof window !== "undefined"
              ? localStorage.getItem("access_token")
              : null;
          if (newAccess) headers.set("Authorization", `Bearer ${newAccess}`);
          res = await apiFetch(urlStr, { ...(init || {}), _retried: true });
        }
      } catch {
        // noop - fall through and return original res
      }
    }
  }

  return res;
}

// Simple JSON helpers
export async function getJson<T = any>(
  path: string,
  init?: ApiFetchInit,
): Promise<T> {
  const r = await apiFetch(path, init);
  return r.json();
}
export async function postJson<T = any>(
  path: string,
  body: any,
  init?: ApiFetchInit,
): Promise<T> {
  const r = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    body: JSON.stringify(body),
    ...init,
  });
  return r.json();
}
export async function patchJson<T = any>(
  path: string,
  body: any,
  init?: ApiFetchInit,
): Promise<T> {
  const r = await apiFetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    body: JSON.stringify(body),
    ...init,
  });
  return r.json();
}
export async function deleteJson<T = any>(
  path: string,
  init?: ApiFetchInit,
): Promise<T> {
  const r = await apiFetch(path, { method: "DELETE", ...(init || {}) });
  return r.json();
}

export default apiFetch;
