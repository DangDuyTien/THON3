import {
  communityPartners,
  exploreStatement,
  fullBleedArrival,
  seasonalGallery,
  storyFrames,
  villageArchive,
  villageMessage,
  villageUpdates,
  visitChoices,
} from "./site-content.js";
import { DEFAULT_SITE_APPEARANCE } from "./site-theme.js";

export const SITE_CONTENT_STORAGE_KEY = "xa-me-linh-site-content-v6";
export const SITE_CONTENT_DRAFT_STORAGE_KEY = "xa-me-linh-site-content-draft-v6";

export const defaultSiteContent = {
  settings: {
    siteName: "XÃ MÊ LINH",
    tagline: "HÀ NỘI",
    footerText: "MỘT NƠI ĐỂ KỂ CHUYỆN",
    coordinates: ["MÊ LINH", "HÀ NỘI"],
    appearance: DEFAULT_SITE_APPEARANCE,
  },
  storyFrames: storyFrames.map((frame) => ({
    ...frame,
    imageSrc: frame.imageSrc || "/assets/village-hero.jpg",
  })),
  villageMessage,
  exploreStatement,
  seasonalGallery,
  visitChoices,
  fullBleedArrival,
  villageArchive: {
    ...villageArchive,
    cards: villageArchive.cards.map((card) => ({
      ...card,
      imageSrc: card.imageSrc || "",
    })),
  },
  communityPartners: {
    ...communityPartners,
    organizations: communityPartners.organizations.map((organization) => ({
      ...organization,
      logo: organization.logo || "",
      logoAlt: organization.logoAlt || "",
    })),
  },
  villageUpdates: {
    ...villageUpdates,
    cards: villageUpdates.cards.map((card) => ({
      ...card,
      imageSrc: card.imageSrc || "",
    })),
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeWithDefaults(defaultValue, overrideValue) {
  if (overrideValue === undefined || overrideValue === null) return clone(defaultValue);
  if (defaultValue === undefined || defaultValue === null) return clone(overrideValue);

  if (Array.isArray(overrideValue)) {
    return overrideValue.map((item) => clone(item));
  }

  if (typeof overrideValue === "object" && typeof defaultValue === "object") {
    const allKeys = Array.from(new Set([...Object.keys(defaultValue), ...Object.keys(overrideValue)]));
    return allKeys.reduce((result, key) => {
      if (overrideValue[key] !== undefined) {
        if (
          defaultValue[key] !== undefined &&
          typeof defaultValue[key] === "object" &&
          defaultValue[key] !== null &&
          !Array.isArray(defaultValue[key])
        ) {
          result[key] = mergeWithDefaults(defaultValue[key], overrideValue[key]);
        } else {
          result[key] = clone(overrideValue[key]);
        }
      } else {
        result[key] = clone(defaultValue[key]);
      }
      return result;
    }, {});
  }

  return overrideValue;
}

export function cloneDefaultSiteContent() {
  return clone(defaultSiteContent);
}

export function normalizeSiteContent(value) {
  return mergeWithDefaults(defaultSiteContent, value);
}

export function loadSiteContent() {
  if (typeof window === "undefined") return cloneDefaultSiteContent();

  try {
    const storedValue = window.localStorage.getItem(SITE_CONTENT_STORAGE_KEY);
    if (storedValue) {
      const parsed = JSON.parse(storedValue);
      if (parsed && typeof parsed === "object") {
        return normalizeSiteContent(parsed);
      }
    }
    return cloneDefaultSiteContent();
  } catch (err) {
    console.error("Error loading site content from localStorage:", err);
    return cloneDefaultSiteContent();
  }
}

export function persistSiteContent(value) {
  const normalizedValue = normalizeSiteContent(value);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SITE_CONTENT_STORAGE_KEY, JSON.stringify(normalizedValue));
    window.dispatchEvent(new Event("site-content-updated"));
  }
  return normalizedValue;
}

export function loadSiteContentDraft() {
  if (typeof window === "undefined") return null;

  try {
    const storedValue = window.localStorage.getItem(SITE_CONTENT_DRAFT_STORAGE_KEY);
    return storedValue ? normalizeSiteContent(JSON.parse(storedValue)) : null;
  } catch {
    return null;
  }
}

export function persistSiteContentDraft(value) {
  const normalizedValue = normalizeSiteContent(value);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SITE_CONTENT_DRAFT_STORAGE_KEY, JSON.stringify(normalizedValue));
  }
  return normalizedValue;
}

export function clearSiteContentDraft() {
  if (typeof window !== "undefined") window.localStorage.removeItem(SITE_CONTENT_DRAFT_STORAGE_KEY);
}
