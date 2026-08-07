import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const manifestPath = join(projectRoot, "media", "cms-images.json");
const requiredWidths = ["640", "960", "1440", "1920"];

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function localAssetExists(url) {
  if (!url.startsWith("/")) return true;
  const pathname = url.split("?", 1)[0];
  return existsSync(join(projectRoot, "public", pathname));
}

function validateSources(sources, label, errors) {
  const webp = sources?.webp;
  if (!webp || typeof webp !== "object") {
    errors.push(`${label}.webp is required`);
    return;
  }

  for (const format of ["webp", "avif"]) {
    const sourceSet = sources?.[format];
    if (!sourceSet) continue;

    for (const width of requiredWidths) {
      const url = sourceSet[width];
      if (!isNonEmptyString(url)) {
        errors.push(`${label}.${format}.${width} is required`);
      } else if (!localAssetExists(url)) {
        errors.push(`${label}.${format}.${width} points to a missing local asset: ${url}`);
      }
    }
  }
}

function validateImage(image, index, errors, ids) {
  const label = `images[${index}]`;
  if (!isNonEmptyString(image.id)) errors.push(`${label}.id is required`);
  if (ids.has(image.id)) errors.push(`${label}.id duplicates ${image.id}`);
  ids.add(image.id);
  if (!isNonEmptyString(image.alt)) errors.push(`${label}.alt is required`);
  if (!Number.isInteger(image.width) || image.width < 1) errors.push(`${label}.width must be a positive integer`);
  if (!Number.isInteger(image.height) || image.height < 1) errors.push(`${label}.height must be a positive integer`);
  if (!isNonEmptyString(image.placeholder)) errors.push(`${label}.placeholder is required`);
  if (!isNonEmptyString(image.version)) errors.push(`${label}.version is required for cache invalidation`);

  for (const axis of ["x", "y"]) {
    const value = image.focalPoint?.[axis];
    if (typeof value !== "number" || value < 0 || value > 1) {
      errors.push(`${label}.focalPoint.${axis} must be between 0 and 1`);
    }
  }

  validateSources(image.sources, `${label}.sources`, errors);

  if (image.variants === undefined) return;
  if (!image.variants || typeof image.variants !== "object" || Array.isArray(image.variants)) {
    errors.push(`${label}.variants must be an object when present`);
    return;
  }

  for (const [variantName, variant] of Object.entries(image.variants)) {
    const variantLabel = `${label}.variants.${variantName}`;
    if (!isNonEmptyString(variantName)) {
      errors.push(`${label}.variants cannot use an empty name`);
    }
    if (!variant || typeof variant !== "object" || Array.isArray(variant)) {
      errors.push(`${variantLabel} must be an object`);
      continue;
    }
    if (variant.version !== undefined && !isNonEmptyString(variant.version)) {
      errors.push(`${variantLabel}.version must be a non-empty string when present`);
    }
    validateSources(variant.sources, `${variantLabel}.sources`, errors);
  }
}

function run() {
  let images;
  try {
    images = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    console.error(`Cannot read ${manifestPath}: ${error.message}`);
    process.exit(1);
  }

  const errors = [];
  if (!Array.isArray(images) || images.length === 0) {
    errors.push("cms-images.json must contain at least one CmsImage");
  } else {
    const ids = new Set();
    images.forEach((image, index) => validateImage(image, index, errors, ids));
  }

  if (errors.length) {
    console.error("CMS media contract failed:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log(`CMS media contract passed for ${images.length} image(s).`);
}

run();
