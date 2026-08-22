/**
 * check-bundle-budget.js
 *
 * Script kiểm tra kích thước bundle sau khi build.
 * Chạy: node scripts/check-bundle-budget.js
 *
 * Ngân sách từ báo cáo P0:
 *   - JavaScript tải ban đầu gzip: < 90 KB
 *   - CSS tải ban đầu gzip: < 30 KB
 *   - Tổng dist (không tính ảnh): < 200 KB gzip
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";

const DIST_DIR = join(import.meta.dirname, "..", "dist");
const ASSETS_DIR = join(DIST_DIR, "assets");

const BUDGET = {
  jsGzipKb: 90,
  cssGzipKb: 30,
  totalCodeGzipKb: 200,
};

const IMAGE_EXTS = new Set([".webp", ".jpg", ".jpeg", ".png", ".avif", ".svg", ".gif", ".ico"]);

function getGzipSize(filePath) {
  const content = readFileSync(filePath);
  const gzipped = gzipSync(content, { level: 9 });
  return gzipped.length;
}

function scanAssets() {
  const results = { js: [], css: [], images: [], other: [] };

  let files;
  try {
    files = readdirSync(ASSETS_DIR);
  } catch {
    console.error("❌ Thư mục dist/assets không tồn tại. Chạy `npm run build` trước.");
    process.exit(1);
  }

  const assetPaths = files.map((file) => join(ASSETS_DIR, file));
  const criticalCssPath = join(DIST_DIR, "critical.css");
  if (existsSync(criticalCssPath)) assetPaths.push(criticalCssPath);

  for (const filePath of assetPaths) {
    const file = filePath === criticalCssPath ? "critical.css" : filePath.slice(`${ASSETS_DIR}/`.length);
    const stat = statSync(filePath);
    if (!stat.isFile()) continue;

    const ext = extname(file).toLowerCase();
    const rawSize = stat.size;
    const gzipSize = IMAGE_EXTS.has(ext) ? rawSize : getGzipSize(filePath);

    const entry = {
      file,
      rawKb: (rawSize / 1024).toFixed(1),
      gzipKb: (gzipSize / 1024).toFixed(1),
    };

    if (ext === ".js") results.js.push(entry);
    else if (ext === ".css") results.css.push(entry);
    else if (IMAGE_EXTS.has(ext)) results.images.push(entry);
    else results.other.push(entry);
  }

  return results;
}

function printTable(label, items, showGzip = true) {
  if (items.length === 0) return;
  console.log(`\n${label}:`);
  console.log("  " + "─".repeat(60));
  for (const item of items) {
    const gzip = showGzip ? ` (gzip: ${item.gzipKb} KB)` : "";
    console.log(`  ${item.file.padEnd(40)} ${item.rawKb.padStart(8)} KB${gzip}`);
  }
}

function run() {
  console.log("🔍 Kiểm tra ngân sách kích thước bundle...\n");
  console.log(`  Ngân sách: JS tải ban đầu < ${BUDGET.jsGzipKb}KB gzip | CSS tải ban đầu < ${BUDGET.cssGzipKb}KB gzip | Tổng code < ${BUDGET.totalCodeGzipKb}KB gzip`);

  const results = scanAssets();
  let violations = 0;

  printTable("📦 JavaScript", results.js);
  printTable("🎨 CSS", results.css);
  printTable("🖼  Ảnh", results.images, false);
  if (results.other.length > 0) printTable("📄 Khác", results.other);

  // Chỉ tính entry của trang chủ vào ngân sách tải ban đầu. Các route lazy,
  // như màn quản trị, được báo riêng và vẫn nằm trong tổng code bên dưới.
  const initialJs = results.js.filter((file) => file.file.startsWith("index-"));
  const deferredJs = results.js.filter((file) => !file.file.startsWith("index-"));
  const initialJsGzip = initialJs.reduce((sum, file) => sum + parseFloat(file.gzipKb), 0);
  const totalJsGzip = results.js.reduce((sum, f) => sum + parseFloat(f.gzipKb), 0);
  const deferredJsGzip = deferredJs.reduce((sum, file) => sum + parseFloat(file.gzipKb), 0);
  if (initialJsGzip > BUDGET.jsGzipKb) {
    console.log(`\n❌ JS tải ban đầu gzip: ${initialJsGzip.toFixed(1)} KB — vượt ngân sách ${BUDGET.jsGzipKb} KB`);
    violations++;
  } else {
    console.log(`\n✅ JS tải ban đầu gzip: ${initialJsGzip.toFixed(1)} KB (ngân sách: ${BUDGET.jsGzipKb} KB)`);
  }
  if (deferredJsGzip > 0) {
    console.log(`ℹ️ JS tải sau theo route: ${deferredJsGzip.toFixed(1)} KB`);
  }

  // CSS cho các route lazy không được tải khi mở trang chủ; giữ chúng trong
  // tổng code, còn giới hạn CSS khởi đầu phản ánh payload thực tế của route đó.
  const initialCss = results.css.filter((file) => file.file === "critical.css" || file.file.startsWith("index-"));
  const deferredCss = results.css.filter((file) => !initialCss.includes(file));
  const initialCssGzip = initialCss.reduce((sum, file) => sum + parseFloat(file.gzipKb), 0);
  const deferredCssGzip = deferredCss.reduce((sum, file) => sum + parseFloat(file.gzipKb), 0);
  const totalCssGzip = initialCssGzip + deferredCssGzip;
  if (initialCssGzip > BUDGET.cssGzipKb) {
    console.log(`❌ CSS tải ban đầu gzip: ${initialCssGzip.toFixed(1)} KB — vượt ngân sách ${BUDGET.cssGzipKb} KB`);
    violations++;
  } else {
    console.log(`✅ CSS tải ban đầu gzip: ${initialCssGzip.toFixed(1)} KB (ngân sách: ${BUDGET.cssGzipKb} KB)`);
  }
  if (deferredCssGzip > 0) {
    console.log(`ℹ️ CSS tải sau theo route: ${deferredCssGzip.toFixed(1)} KB`);
  }

  // Kiểm tra tổng code
  const totalCodeGzip = totalJsGzip + totalCssGzip;
  if (totalCodeGzip > BUDGET.totalCodeGzipKb) {
    console.log(`❌ Tổng code gzip: ${totalCodeGzip.toFixed(1)} KB — vượt ngân sách ${BUDGET.totalCodeGzipKb} KB`);
    violations++;
  } else {
    console.log(`✅ Tổng code gzip: ${totalCodeGzip.toFixed(1)} KB (ngân sách: ${BUDGET.totalCodeGzipKb} KB)`);
  }

  // Tổng kết
  console.log("\n" + "═".repeat(60));
  if (violations > 0) {
    console.log(`❌ ${violations} vi phạm ngân sách! Không được merge.`);
    process.exit(1);
  } else {
    console.log("✅ Tất cả đạt ngân sách. Được phép merge.");
  }
}

run();
