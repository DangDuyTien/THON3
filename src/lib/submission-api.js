import { apiRequest, apiUrl } from "./backend-api.js";

export async function createSubmission(data) {
  const result = await apiRequest("/api/submissions", { method: "POST", body: JSON.stringify(data) });
  return result.data;
}

export async function listPendingSubmissions() {
  const items = (await apiRequest("/api/submissions?status=pending")).data || [];
  return items.map((item) => ({
    ...item,
    imageSrc: item.imageSrc ? apiUrl(item.imageSrc) : "",
    altImageSrc: item.altImageSrc ? apiUrl(item.altImageSrc) : "",
  }));
}

export async function rejectSubmission(id, reviewNote = "") {
  return (await apiRequest(`/api/submissions/${id}/reject`, { method: "POST", body: JSON.stringify({ reviewNote }) })).data;
}

export async function approveSubmission(id) {
  return (await apiRequest(`/api/submissions/${id}/approve`, { method: "POST" })).data;
}
