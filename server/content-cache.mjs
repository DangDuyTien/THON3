import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db.mjs";

const CONTENT_CACHE_TTL_MS = 60_000;
const SITE_KEY = "default";

// Snapshot đĩa giúp phục vụ nội dung ngay cả khi MySQL (free tier) ngủ hoặc mất kết nối.
const SNAPSHOT_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), ".cache", "published-content.json");

function isValidEntry(value) {
  return Boolean(value) && typeof value === "object" && "content" in value;
}

export function createContentCache({
  fetchFromDb,
  snapshotPath = SNAPSHOT_PATH,
  ttlMs = CONTENT_CACHE_TTL_MS,
  now = Date.now,
} = {}) {
  if (typeof fetchFromDb !== "function") throw new Error("content-cache cần fetchFromDb() để đọc DB.");
  let memory = null;
  let refreshInFlight = null;

  const readSnapshot = () => {
    try {
      const parsed = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
      if (!isValidEntry(parsed)) return null;
      return { ...parsed, fetchedAt: Number(parsed.fetchedAt) || 0 };
    } catch {
      return null;
    }
  };

  const writeSnapshot = (entry) => {
    try {
      fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
      fs.writeFileSync(snapshotPath, JSON.stringify(entry));
    } catch {
      // Đĩa chỉ đọc hoặc đầy: cache trong RAM vẫn hoạt động.
    }
  };

  const getCachedContent = () => {
    if (!memory) memory = readSnapshot();
    return memory;
  };

  const isStale = () => {
    const entry = getCachedContent();
    return !entry || now() - entry.fetchedAt > ttlMs;
  };

  const refreshFromDb = async () => {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      const result = await fetchFromDb();
      const entry = {
        content: result?.content ?? null,
        version: result?.version ?? 0,
        updatedAt: result?.updatedAt ?? null,
        fetchedAt: now(),
      };
      memory = entry;
      writeSnapshot(entry);
      return entry;
    })();
    try {
      return await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  };

  const storeContent = (content, version) => {
    const entry = {
      content: content ?? null,
      version: version ?? 0,
      updatedAt: new Date(now()).toISOString(),
      fetchedAt: now(),
    };
    memory = entry;
    writeSnapshot(entry);
    return entry;
  };

  return { getCachedContent, isStale, refreshFromDb, storeContent };
}

async function fetchPublishedFromDb() {
  const [rows] = await pool.execute(
    "SELECT content, version, updated_at FROM site_content WHERE site_key = ? LIMIT 1",
    [SITE_KEY],
  );
  if (!rows[0]) return null;
  return {
    content: typeof rows[0].content === "string" ? JSON.parse(rows[0].content) : rows[0].content,
    version: rows[0].version,
    updatedAt: rows[0].updated_at,
  };
}

export const contentCache = createContentCache({ fetchFromDb: fetchPublishedFromDb });
