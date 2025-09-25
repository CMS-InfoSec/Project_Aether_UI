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
  // Rewrite /api/... to /api/v1/... when targeting same-origin backend
  try {
    const u = new URL(urlStr, base);
    const sameOrigin = !/^https?:/i.test(urlStr) || u.origin === new URL(base).origin;
    if (sameOrigin && /\/api\//.test(u.pathname) && !/\/api\/v1\//.test(u.pathname)) {
      u.pathname = u.pathname.replace(/\/api\//, "/api/v1/");
      urlStr = u.toString();
    }
  } catch {}

  // Prepare headers
  const headers = new Headers(
    init?.headers ||
      (typeof input !== "string" && "headers" in input
        ? (input as Request).headers
        : undefined),
  );

  // Attach Authorization unless disabled
  let access = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  if (!access && typeof window !== "undefined") {
    access = sessionStorage.getItem("access_token");
  }
  if (!init?.noAuth && access && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${access}`);
  }

  // Add admin key when needed (from env/config only)
  if (shouldAddAdminKey(urlStr, init) && !headers.has("X-API-Key")) {
    let envKey: string | undefined = undefined;
    try { envKey = (import.meta as any)?.env?.VITE_API_KEY; } catch {}
    const cfgKey = typeof window !== "undefined" ? localStorage.getItem("aether-api-key") || undefined : undefined;
    const apiKey = envKey || cfgKey;
    if (apiKey) headers.set("X-API-Key", apiKey);
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

          const nullBodyStatuses = new Set([204, 205, 304]);
          const bodyAllowed = !nullBodyStatuses.has(status);
          let response: Response;
          if (bodyAllowed) {
            const body = xhr.response instanceof Blob ? xhr.response : new Blob([xhr.response]);
            response = new Response(body, {
              status,
              statusText,
              headers: resHeaders,
            });
          } else {
            response = new Response(null, {
              status,
              statusText,
              headers: resHeaders,
            });
          }
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
    // If window.fetch is present but appears to be patched by third-party scripts (like FullStory),
    // prefer the XHR fallback. We detect a native fetch by checking its source string for "[native code]".
    const hasWindowFetch = typeof window !== "undefined" && (window as any).fetch;
    let fetchImpl: any = null;

    if (hasWindowFetch) {
      try {
        const src = Function.prototype.toString.call((window as any).fetch);
        if (src && src.indexOf("[native code]") !== -1) {
          fetchImpl = (window as any).fetch;
        }
      } catch (err) {
        // If any error inspecting fetch, fall back to using XHR below
        fetchImpl = null;
      }
    }

    // If no native fetch implementation found, use XHR directly
    if (!fetchImpl) {
      return await xhrFetch(urlStr, init);
    }

    // Otherwise use fetch, but guard against runtime throws
    try {
      return await fetchImpl(urlStr, { ...init, headers });
    } catch (err) {
      return await xhrFetch(urlStr, init);
    }
  };

  // Execute doFetch with a final fallback to xhrFetch
  let res: Response;
  try {
    res = await doFetch();
  } catch (err) {
    try {
      res = await xhrFetch(urlStr, init);
    } catch (err2) {
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
          let newAccess = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
          if (!newAccess && typeof window !== "undefined") newAccess = sessionStorage.getItem("access_token");
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
  if (r.status === 204 || r.status === 205) return null as any;
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await r.text();
    if (!text) return null as any;
    try {
      return JSON.parse(text) as T;
    } catch (err) {
      throw new Error(`Expected JSON response but received: ${text}`);
    }
  }
  return r.json() as Promise<T>;
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
  if (r.status === 204 || r.status === 205) return null as any;
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await r.text();
    if (!text) return null as any;
    try {
      return JSON.parse(text) as T;
    } catch (err) {
      throw new Error(`Expected JSON response but received: ${text}`);
    }
  }
  return r.json() as Promise<T>;
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
  if (r.status === 204 || r.status === 205) return null as any;
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await r.text();
    if (!text) return null as any;
    try {
      return JSON.parse(text) as T;
    } catch (err) {
      throw new Error(`Expected JSON response but received: ${text}`);
    }
  }
  return r.json() as Promise<T>;
}
export async function deleteJson<T = any>(
  path: string,
  init?: ApiFetchInit,
): Promise<T> {
  const r = await apiFetch(path, { method: "DELETE", ...(init || {}) });
  if (r.status === 204 || r.status === 205) return null as any;
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await r.text();
    if (!text) return null as any;
    try {
      return JSON.parse(text) as T;
    } catch (err) {
      throw new Error(`Expected JSON response but received: ${text}`);
    }
  }
  return r.json() as Promise<T>;
}

export default apiFetch;
