import { apiRequest, isBackendConfigured, setCsrfToken } from "./backend-api.js";

export async function signIn(credentials) {
  if (!isBackendConfigured) throw new Error("Backend MySQL chưa được cấu hình.");
  const data = (await apiRequest("/api/auth/login", { method: "POST", body: JSON.stringify(credentials) })).data;
  if (data?.csrfToken) setCsrfToken(data.csrfToken);
  return data;
}

export async function verifyLoginOtp(credentials) {
  if (!isBackendConfigured) throw new Error("Backend MySQL chưa được cấu hình.");
  const data = (await apiRequest("/api/auth/login/verify", { method: "POST", body: JSON.stringify(credentials) })).data;
  if (data?.csrfToken) setCsrfToken(data.csrfToken);
  return data;
}

export async function changePassword(credentials) {
  if (!isBackendConfigured) throw new Error("Backend MySQL chưa được cấu hình.");
  const data = (await apiRequest("/api/auth/password/change", { method: "POST", body: JSON.stringify(credentials) })).data;
  if (data?.csrfToken) setCsrfToken(data.csrfToken);
  return data;
}

export async function requestPasswordRecovery(credentials) {
  if (!isBackendConfigured) throw new Error("Backend MySQL chưa được cấu hình.");
  return (await apiRequest("/api/auth/password/recovery/request", { method: "POST", body: JSON.stringify(credentials) })).data;
}

export async function confirmPasswordRecovery(credentials) {
  if (!isBackendConfigured) throw new Error("Backend MySQL chưa được cấu hình.");
  return (await apiRequest("/api/auth/password/recovery/confirm", { method: "POST", body: JSON.stringify(credentials) })).data;
}

export async function signOut() {
  try {
    if (isBackendConfigured) await apiRequest("/api/auth/logout", { method: "POST" });
  } finally {
    setCsrfToken("");
  }
}

export async function getSession() {
  if (!isBackendConfigured) return null;
  try {
    const data = (await apiRequest("/api/auth/session")).data;
    if (data?.csrfToken) setCsrfToken(data.csrfToken);
    return data;
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
}

export function subscribeToAuth() {
  return () => {};
}
