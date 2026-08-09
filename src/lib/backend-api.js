const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
export const isBackendConfigured = Boolean(rawBaseUrl.trim());
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE_URL) return normalizedPath;
  if (API_BASE_URL.endsWith("/api") && normalizedPath.startsWith("/api/")) return `${API_BASE_URL}${normalizedPath.slice(4)}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

async function parseResponse(response) {
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const error = new Error(payload?.error || `Yêu cầu máy chủ thất bại (${response.status}).`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(apiUrl(path), { ...options, headers, credentials: "include" });
  return parseResponse(response);
}

export { apiUrl };
