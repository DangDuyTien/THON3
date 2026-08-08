import { cloneDefaultSiteContent, normalizeSiteContent } from "../content/content-store.js";
import { requireSupabase, supabase } from "./supabase.js";

const SITE_KEY = "default";

function mapRow(row) {
  return row?.content ? normalizeSiteContent(row.content) : null;
}

export async function getPublishedContent() {
  if (!supabase) return cloneDefaultSiteContent();
  const { data, error } = await supabase
    .from("site_content")
    .select("content, version, updated_at")
    .eq("site_key", SITE_KEY)
    .maybeSingle();
  if (error) throw error;
  return mapRow(data) || cloneDefaultSiteContent();
}

export async function getDraftContent(userId) {
  if (!userId || !supabase) return null;
  const { data, error } = await supabase
    .from("site_content_drafts")
    .select("id, content, version, updated_at")
    .eq("site_key", SITE_KEY)
    .eq("updated_by", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? { ...data, content: mapRow(data) } : null;
}

export async function saveDraftContent(content, userId, expectedVersion = null) {
  const client = requireSupabase();
  const normalized = normalizeSiteContent(content);
  const payload = { site_key: SITE_KEY, content: normalized, updated_by: userId };
  if (expectedVersion !== null) payload.version = expectedVersion + 1;
  const { data, error } = await client
    .from("site_content_drafts")
    .upsert(payload, { onConflict: "site_key,updated_by" })
    .select("id, content, version, updated_at")
    .single();
  if (error) throw error;
  return { ...data, content: normalizeSiteContent(data.content) };
}

export async function publishContent(content, userId, expectedVersion = null) {
  const client = requireSupabase();
  const normalized = normalizeSiteContent(content);
  const { data: current, error: currentError } = await client
    .from("site_content")
    .select("version")
    .eq("site_key", SITE_KEY)
    .maybeSingle();
  if (currentError) throw currentError;
  if (expectedVersion !== null && current && current.version !== expectedVersion) {
    throw new Error("Nội dung đã được thay đổi bởi người quản trị khác. Hãy tải lại trước khi publish.");
  }
  const { data, error } = await client
    .from("site_content")
    .upsert({
      site_key: SITE_KEY,
      content: normalized,
      version: (current?.version || 0) + 1,
      updated_by: userId,
    }, { onConflict: "site_key" })
    .select("content, version, updated_at")
    .single();
  if (error) throw error;
  return { ...data, content: normalizeSiteContent(data.content) };
}

export async function deleteDraftContent(userId) {
  const client = requireSupabase();
  const { error } = await client
    .from("site_content_drafts")
    .delete()
    .eq("site_key", SITE_KEY)
    .eq("updated_by", userId);
  if (error) throw error;
}
