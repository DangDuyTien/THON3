import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createContentCache } from "./content-cache.mjs";

function createTempSnapshotPath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "content-cache-")), "published-content.json");
}

test("phục vụ từ cache mà không chạm DB trong TTL", async () => {
  let dbReads = 0;
  let clock = 1_000;
  const cache = createContentCache({
    fetchFromDb: async () => {
      dbReads += 1;
      return { content: { hello: "world" }, version: 1, updatedAt: "2026-01-01T00:00:00.000Z" };
    },
    snapshotPath: createTempSnapshotPath(),
    ttlMs: 60_000,
    now: () => clock,
  });

  const fresh = await cache.refreshFromDb();
  assert.equal(dbReads, 1);
  assert.deepEqual(fresh.content, { hello: "world" });

  clock += 30_000;
  assert.equal(cache.isStale(), false);
  const cached = cache.getCachedContent();
  assert.deepEqual(cached.content, { hello: "world" });
  assert.equal(cached.version, 1);
  assert.equal(dbReads, 1);
});

test("cache quá hạn thì isStale báo đúng và refresh lấy dữ liệu mới", async () => {
  let dbReads = 0;
  let clock = 1_000;
  const cache = createContentCache({
    fetchFromDb: async () => {
      dbReads += 1;
      return { content: { rev: dbReads }, version: dbReads, updatedAt: null };
    },
    snapshotPath: createTempSnapshotPath(),
    ttlMs: 60_000,
    now: () => clock,
  });

  await cache.refreshFromDb();
  clock += 61_000;
  assert.equal(cache.isStale(), true);
  const refreshed = await cache.refreshFromDb();
  assert.deepEqual(refreshed.content, { rev: 2 });
  assert.equal(cache.isStale(), false);
  assert.equal(dbReads, 2);
});

test("DB lỗi thì giữ nguyên cache cũ", async () => {
  let shouldFail = false;
  let clock = 1_000;
  const cache = createContentCache({
    fetchFromDb: async () => {
      if (shouldFail) throw new Error("MySQL ngủ");
      return { content: { stable: true }, version: 7, updatedAt: null };
    },
    snapshotPath: createTempSnapshotPath(),
    ttlMs: 60_000,
    now: () => clock,
  });

  await cache.refreshFromDb();
  shouldFail = true;
  clock += 61_000;
  await assert.rejects(() => cache.refreshFromDb());
  const cached = cache.getCachedContent();
  assert.deepEqual(cached.content, { stable: true });
  assert.equal(cached.version, 7);
});

test("đọc lại snapshot đĩa khi memory rỗng và ghi write-through qua storeContent", async () => {
  const snapshotPath = createTempSnapshotPath();
  let clock = 1_000;
  const writer = createContentCache({
    fetchFromDb: async () => null,
    snapshotPath,
    ttlMs: 60_000,
    now: () => clock,
  });

  writer.storeContent({ from: "publish" }, 9);
  clock += 10_000;

  const reader = createContentCache({
    fetchFromDb: async () => {
      throw new Error("không được phép chạm DB");
    },
    snapshotPath,
    ttlMs: 60_000,
    now: () => clock,
  });

  const cached = reader.getCachedContent();
  assert.deepEqual(cached.content, { from: "publish" });
  assert.equal(cached.version, 9);
  assert.equal(reader.isStale(), false);
});

test("snapshot thiếu/hỏng thì coi như chưa có cache", () => {
  const snapshotPath = createTempSnapshotPath();
  fs.writeFileSync(snapshotPath, "{ broken json");
  const cache = createContentCache({
    fetchFromDb: async () => null,
    snapshotPath,
    ttlMs: 60_000,
    now: () => 1_000,
  });

  assert.equal(cache.getCachedContent(), null);
  assert.equal(cache.isStale(), true);
});
