import { requireSupabase } from "./supabase.js";

export async function createSubmission(data) {
  const client = requireSupabase();
  const { data: row, error } = await client.from("submissions").insert({
    name: data.name,
    age: data.age,
    school: data.school,
    image_asset_id: data.imageAssetId,
    alt_image_asset_id: data.altImageAssetId || null,
  }).select("*").single();
  if (error) throw error;
  return row;
}

export async function listPendingSubmissions() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("submissions")
    .select("*")
    .eq("status", "pending")
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function rejectSubmission(id, reviewNote = "") {
  const client = requireSupabase();
  const { data, error } = await client.rpc("reject_submission", { submission_id: id, review_note: reviewNote });
  if (error) throw error;
  return data;
}

export async function approveSubmission(id, card) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("approve_submission", {
    submission_id: id,
    card_payload: card,
  });
  if (error) throw error;
  return data;
}
