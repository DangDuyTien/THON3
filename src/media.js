import cmsImages from "../media/cms-images.json";

/**
 * Contract anh dung chung voi CMS/CDN.
 *
 * @typedef {Object} CmsImage
 * @property {string} id
 * @property {string} alt
 * @property {number} width
 * @property {number} height
 * @property {{x: number, y: number}} focalPoint
 * @property {{avif?: Record<number, string>, webp?: Record<number, string>}} sources
 * @property {Record<string, {sources: {avif?: Record<number, string>, webp?: Record<number, string>}, version?: string}>} [variants]
 * @property {string} placeholder
 * @property {string} [version]
 */

const VARIANT_MAX_WIDTH = Object.freeze({
  full: 1920,
  ultra: 4096,
  large: 1440,
  medium: 960,
  small: 640,
});

/** @type {CmsImage} */
export const VILLAGE_HERO_MEDIA = Object.freeze(
  cmsImages.find((image) => image.id === "village-hero"),
);
const CAMP_GATE_LEFT_MEDIA = Object.freeze(
  cmsImages.find((image) => image.id === "camp-gate-left"),
);
const CAMP_GATE_RIGHT_MEDIA = Object.freeze(
  cmsImages.find((image) => image.id === "camp-gate-right"),
);
const CAMP_GATE_TOP_MEDIA = Object.freeze(
  cmsImages.find((image) => image.id === "camp-gate-top"),
);
const CAMP_GATE_WHOLE_MEDIA = Object.freeze(
  cmsImages.find((image) => image.id === "camp-gate-whole"),
);
const CAMP_GATE_USER_CUTOUT_MEDIA = Object.freeze(
  cmsImages.find((image) => image.id === "camp-gate-user-cutout"),
);

const legacyMedia = new Map([
  ["/assets/village-hero.jpg", VILLAGE_HERO_MEDIA],
  ["/assets/camp-gate-left-v3.png", CAMP_GATE_LEFT_MEDIA],
  ["/assets/camp-gate-right-v3.png", CAMP_GATE_RIGHT_MEDIA],
  ["/assets/camp-gate-top-v3.png", CAMP_GATE_TOP_MEDIA],
  ["/assets/camp-gate-thon3-v5.png", CAMP_GATE_WHOLE_MEDIA],
  ["/assets/camp-gate-thon3-user-4k-cutout.png", CAMP_GATE_USER_CUTOUT_MEDIA],
]);
const prewarmedSources = new Set();

function withVersion(url, version) {
  if (!url || !version) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
}

function toSourceEntries(sources, maxWidth, version) {
  if (!sources) return [];

  const entries = Object.entries(sources)
    .map(([width, url]) => ({ url: withVersion(url, version), width: Number(width) }))
    .filter((item) => Number.isFinite(item.width) && item.width > 0 && item.url)
    .sort((left, right) => left.width - right.width);
  const filtered = entries.filter((item) => item.width <= maxWidth);
  return filtered.length ? filtered : entries.slice(0, 1);
}

export function resolveCmsImage(mediaOrSource) {
  if (!mediaOrSource) return null;
  if (typeof mediaOrSource === "string") return legacyMedia.get(mediaOrSource) || null;
  return mediaOrSource;
}

function getColorVariant(media, colorVariant) {
  if (!colorVariant || colorVariant === "base") return media;
  return {
    ...media,
    ...(media.variants?.[colorVariant] || {}),
  };
}

export function getCmsImageAttributes(mediaOrSource, sizeVariant = "full", colorVariant = "base") {
  const media = resolveCmsImage(mediaOrSource);
  if (!media) return null;

  const selectedVariant = getColorVariant(media, colorVariant);
  const maxWidth = VARIANT_MAX_WIDTH[sizeVariant] || VARIANT_MAX_WIDTH.full;
  const webpEntries = toSourceEntries(selectedVariant.sources?.webp, maxWidth, selectedVariant.version);
  const avifEntries = toSourceEntries(selectedVariant.sources?.avif, maxWidth, selectedVariant.version);
  const preferred = webpEntries.at(-1) || avifEntries.at(-1);
  if (!preferred) return null;

  return {
    avifSrcSet: avifEntries.map((item) => `${item.url} ${item.width}w`).join(", "),
    height: media.height,
    placeholder: media.placeholder,
    src: preferred.url,
    srcSet: webpEntries.map((item) => `${item.url} ${item.width}w`).join(", "),
    width: media.width,
  };
}

export function getCmsImagePosition(mediaOrSource) {
  const media = resolveCmsImage(mediaOrSource);
  if (!media?.focalPoint) return undefined;
  return `${Math.round(media.focalPoint.x * 100)}% ${Math.round(media.focalPoint.y * 100)}%`;
}

/**
 * Bat dau tai media truoc khi no vao cua so render. Cache theo srcset/sizes de
 * khong tao them request khi scene chuyen qua lai.
 */
export function prewarmCmsImage(mediaOrSource, sizeVariant = "full", sizes = "100vw", colorVariant = "base") {
  if (typeof document === "undefined") return;

  const attributes = getCmsImageAttributes(mediaOrSource, sizeVariant, colorVariant);
  const src = attributes?.src || (typeof mediaOrSource === "string" ? mediaOrSource : "");
  if (!src) return;

  const key = `${src}|${attributes?.avifSrcSet || ""}|${attributes?.srcSet || ""}|${sizes}`;
  if (prewarmedSources.has(key)) return;
  prewarmedSources.add(key);

  const picture = document.createElement("picture");
  const image = document.createElement("img");
  picture.hidden = true;
  picture.setAttribute("aria-hidden", "true");

  if (attributes?.avifSrcSet) {
    const source = document.createElement("source");
    source.sizes = sizes;
    source.srcset = attributes.avifSrcSet;
    source.type = "image/avif";
    picture.appendChild(source);
  }

  image.decoding = "async";
  image.sizes = sizes;
  if (attributes?.srcSet) image.srcset = attributes.srcSet;
  picture.appendChild(image);
  const cleanup = () => picture.remove();
  image.addEventListener("load", cleanup, { once: true });
  image.addEventListener("error", cleanup, { once: true });
  document.body.appendChild(picture);
  image.src = src;
}
