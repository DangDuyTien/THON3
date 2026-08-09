import { normalizeSiteContent } from "../content/content-store.js";
import { apiRequest, isBackendConfigured } from "./backend-api.js";

function requireBackend() {
  if (!isBackendConfigured) throw new Error("Backend MySQL chưa được cấu hình.");
}

export async function getPublishedContent() {
  requireBackend();
  const result = await apiRequest("/api/content/published");
  return result.data?.content ? normalizeSiteContent(result.data.content) : normalizeSiteContent({});
}

export async function getDraftContent() {
  requireBackend();
  const result = await apiRequest("/api/content/draft");
  return result.data ? { ...result.data, content: normalizeSiteContent(result.data.content) } : null;
}

export async function saveDraftContent(content, _userId, expectedVersion = null) {
  requireBackend();
  const result = await apiRequest("/api/content/draft", { method: "PUT", body: JSON.stringify({ content: normalizeSiteContent(content), expectedVersion }) });
  return { ...result.data, content: normalizeSiteContent(result.data.content) };
}

export async function publishContent(content, _userId, expectedVersion = null) {
  requireBackend();
  const result = await apiRequest("/api/content/publish", { method: "POST", body: JSON.stringify({ content: normalizeSiteContent(content), expectedVersion }) });
  return { ...result.data, content: normalizeSiteContent(result.data.content) };
}

export async function deleteDraftContent() {
  requireBackend();
  await apiRequest("/api/content/draft", { method: "DELETE" });
}
