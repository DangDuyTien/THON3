/**
 * generate-hero-avif.mjs
 *
 * Sinh bản AVIF cho các biến ảnh village-hero tải trên điện thoại (hero-home,
 * story-message) từ bản WebP cùng cỡ đã có. Quality 60 + chroma 4:4:4 để giữ
 * chi tiết lá cây/sắc màu ngang bản WebP; thấp hơn sẽ mờ rõ trên ảnh phong cảnh.
 * Chạy: node scripts/generate-hero-avif.mjs
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const variants = ["hero-home", "story-message"];
const widths = [640, 960, 1440, 1920];

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const assetDirectory = join(scriptDirectory, "..", "public", "assets");

let generatedCount = 0;
for (const variant of variants) {
  for (const width of widths) {
    const source = join(assetDirectory, `village-hero-${variant}-${width}.webp`);
    const target = join(assetDirectory, `village-hero-${variant}-${width}.avif`);
    if (!existsSync(source)) {
      console.warn(`Skipping village-hero-${variant}-${width}: source WebP is unavailable.`);
      continue;
    }

    await sharp(source).avif({ quality: 60, chromaSubsampling: "4:4:4", effort: 6 }).toFile(target);
    generatedCount += 1;
    console.log(`Generated village-hero-${variant}-${width}.avif`);
  }
}

console.log(`Generated ${generatedCount} AVIF variants.`);
