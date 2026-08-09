import { apiRequest } from "./backend-api.js";

export async function createSubmission(data) {
  const result = await apiRequest("/api/submissions", { method: "POST", body: JSON.stringify(data) });
  return result.data;
}

export async function listPendingSubmissions() {
  return (await apiRequest("/api/submissions?status=pending")).data || [];
}

export async function rejectSubmission(id, reviewNote = "") {
  return (await apiRequest(`/api/submissions/${id}/reject`, { method: "POST", body: JSON.stringify({ reviewNote }) })).data;
}

export async function approveSubmission(id, card) {
  return (await apiRequest(`/api/submissions/${id}/approve`, { method: "POST", body: JSON.stringify({ card }) })).data;
}
