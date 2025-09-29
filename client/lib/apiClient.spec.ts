import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getBaseUrl, apiFetch } from "./apiClient";

function setLocal(k: string, v: string | null) {
  if (!globalThis.window) (globalThis as any).window = {} as any;
  if (!(window as any).localStorage) {
    const store: Record<string, string> = {};
    (window as any).localStorage = {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, val: string) => {
        store[key] = String(val);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
      key: (i: number) => Object.keys(store)[i] || null,
      get length() {
        return Object.keys(store).length;
      },
    } as any;
  }
  if (v === null) (window as any).localStorage.removeItem(k);
  else (window as any).localStorage.setItem(k, v);
}

describe("apiClient config", () => {
  beforeAll(() => {
    (globalThis as any).XMLHttpRequest = class {
      open() {}
      setRequestHeader() {}
      send() {
        this.onload?.();
      }
      onload?: () => void;
      onerror?: () => void;
      ontimeout?: () => void;
      getAllResponseHeaders() {
        return "";
      }
      status = 200;
      statusText = "OK";
      response: any = new Blob([JSON.stringify({ ok: true })], {
        type: "application/json",
      });
      timeout = 0;
      withCredentials = false;
      responseType = "" as any;
    } as any;
  });

  afterAll(() => {
    delete (globalThis as any).XMLHttpRequest;
  });

  it("reads base URL from localStorage", () => {
    setLocal("aether-backend-url", "https://api.example.com");
    (window as any).location = { origin: "http://localhost:3000" } as any;
    expect(getBaseUrl()).toBe("https://api.example.com");
  });

  it("attaches X-API-Key for admin endpoints", async () => {
    setLocal("aether-api-key", "test-key-123");
    (window as any).location = {
      origin: "http://localhost:3000",
      host: "localhost:3000",
      protocol: "http:",
    } as any;
    const res = await apiFetch("/api/admin/test", {
      method: "GET",
      admin: true,
    });
    expect(res).toBeInstanceOf(Response);
  });
});
