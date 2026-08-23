import { apiRequest, isBackendConfigured, setCsrfToken } from "./backend-api.js";

function requireBackend() {
  if (!isBackendConfigured) throw new Error("Backend MySQL chưa được cấu hình.");
}

export async function getSecurityStatus() {
  requireBackend();
  return (await apiRequest("/api/auth/security")).data;
}

export async function revokeAllSessions(currentPassword) {
  requireBackend();
  await apiRequest("/api/auth/sessions/revoke", { method: "POST", body: JSON.stringify({ currentPassword }) });
}

export async function requestMfaEnrollment(currentPassword) {
  requireBackend();
  return (await apiRequest("/api/auth/mfa/request", { method: "POST", body: JSON.stringify({ currentPassword }) })).data;
}

export async function confirmMfaEnrollment(challengeId, code) {
  requireBackend();
  const data = (await apiRequest("/api/auth/mfa/confirm", { method: "POST", body: JSON.stringify({ challengeId, code }) })).data;
  if (data?.csrfToken) setCsrfToken(data.csrfToken);
  return data;
}

export async function disableMfa(currentPassword) {
  requireBackend();
  const data = (await apiRequest("/api/auth/mfa/disable", { method: "POST", body: JSON.stringify({ currentPassword }) })).data;
  if (data?.csrfToken) setCsrfToken(data.csrfToken);
  return data;
}

export async function listContentRevisions({ limit = 30 } = {}) {
  requireBackend();
  const query = new URLSearchParams({ limit: String(Math.min(Math.max(Number(limit) || 1, 1), 100)) });
  return (await apiRequest(`/api/content/revisions?${query.toString()}`)).data || [];
}

export async function restoreContentRevision(version, currentPassword) {
  requireBackend();
  return (await apiRequest(`/api/content/revisions/${encodeURIComponent(version)}/restore`, {
    method: "POST",
    body: JSON.stringify({ currentPassword }),
  })).data;
}

export async function listAuditLogs({ limit = 50 } = {}) {
  requireBackend();
  const query = new URLSearchParams({ limit: String(Math.min(Math.max(Number(limit) || 1, 1), 200)) });
  return (await apiRequest(`/api/admin/audit?${query.toString()}`)).data || [];
}
