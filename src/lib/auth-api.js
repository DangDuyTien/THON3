import { apiRequest, isBackendConfigured } from "./backend-api.js";

export async function signIn(credentials) {
  if (!isBackendConfigured) throw new Error("Backend MySQL chưa được cấu hình.");
  return (await apiRequest("/api/auth/login", { method: "POST", body: JSON.stringify(credentials) })).data;
}

export async function signOut() {
  if (isBackendConfigured) await apiRequest("/api/auth/logout", { method: "POST" });
}

export async function getSession() {
  if (!isBackendConfigured) return null;
  try {
    return (await apiRequest("/api/auth/session")).data;
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
}

export function subscribeToAuth() {
  return () => {};
}
