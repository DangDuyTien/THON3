import {
  communityPartners,
  closing,
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

const LEGACY_ARCHIVE_PLACEHOLDERS = new Map([
  ["member1", ["Nguyễn Văn An", "Bí thư Chi đoàn"]],
  ["member2", ["Trần Thị Mai", "Phó Bí thư"]],
  ["member3", ["Lê Hoàng Nam", "Ủy viên BCH"]],
  ["member4", ["Phạm Đức Anh", "Đội trưởng TNXP"]],
  ["member5", ["Hoàng Thị Hương", "Đoàn viên Xuất sắc"]],
  ["member6", ["Vũ Minh Tuấn", "Bí thư Thôn 1"]],
  ["member7", ["Đặng Thanh Hà", "Trưởng Ban Văn Thể"]],
  ["member8", ["Bùi Quốc Việt", "Bí thư Chi đoàn 2"]],
]);

export const defaultSiteContent = {
  settings: {
    siteName: "XÃ MÊ LINH",
    tagline: "HÀ NỘI",
    footerText: "MỘT NƠI ĐỂ KỂ CHUYỆN",
    coordinates: ["MÊ LINH", "HÀ NỘI"],
    menuImages: [
      "/assets/village-hero.jpg",
      "/assets/village-hero.jpg",
      "/assets/village-hero.jpg",
      "/assets/village-hero.jpg",
    ],
    adminLoginImage: "/assets/village-hero.jpg",
    adminLoginImageAlt: "Phong cảnh Mê Linh trong màn hình đăng nhập quản trị.",
    appearance: DEFAULT_SITE_APPEARANCE,
  },
  storyFrames: storyFrames.map((frame) => ({ ...frame, imageSrc: frame.imageSrc || "/assets/village-hero.jpg" })),
  villageMessage,
  exploreStatement,
  seasonalGallery,
  visitChoices,
  fullBleedArrival,
  closing,
  villageArchive: {
    ...villageArchive,
    cards: villageArchive.cards.map((card) => ({ ...card, imageSrc: card.imageSrc || "" })),
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
    cards: villageUpdates.cards.map((card) => ({ ...card, imageSrc: card.imageSrc || "" })),
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeWithDefaults(defaultValue, overrideValue) {
  if (overrideValue === undefined || overrideValue === null) return clone(defaultValue);
  if (defaultValue === undefined || defaultValue === null) return clone(overrideValue);
  if (Array.isArray(defaultValue)) {
    if (!Array.isArray(overrideValue)) return clone(defaultValue);
    const objectArray = defaultValue.some((item) => item && typeof item === "object" && !Array.isArray(item));
    const normalized = overrideValue.map((item, index) => {
      const defaultItem = defaultValue[index];
      if (defaultItem && typeof defaultItem === "object" && !Array.isArray(defaultItem)) {
        return item && typeof item === "object" && !Array.isArray(item)
          ? mergeWithDefaults(defaultItem, item)
          : clone(defaultItem);
      }
      return item === null || item === undefined ? (defaultItem === undefined ? null : clone(defaultItem)) : clone(item);
    });
    return objectArray ? normalized.filter((item) => item && typeof item === "object" && !Array.isArray(item)) : normalized;
  }
  if (Array.isArray(overrideValue)) return clone(defaultValue);
  if (typeof overrideValue === "object" && typeof defaultValue === "object") {
    const allKeys = Array.from(new Set([...Object.keys(defaultValue), ...Object.keys(overrideValue)]));
    return allKeys.reduce((result, key) => {
      result[key] = overrideValue[key] === undefined ? clone(defaultValue[key]) : mergeWithDefaults(defaultValue[key], overrideValue[key]);
      return result;
    }, {});
  }
  return overrideValue;
}

export function cloneDefaultSiteContent() {
  return clone(defaultSiteContent);
}

export function normalizeSiteContent(value) {
  const content = mergeWithDefaults(defaultSiteContent, value);
  content.villageArchive.cards = content.villageArchive.cards.map((card) => {
    const legacy = LEGACY_ARCHIVE_PLACEHOLDERS.get(card.id);
    if (!legacy || card.label !== legacy[0] || card.year !== legacy[1]) return card;
    return { ...card, altImageSrc: "", imageAlt: "", imageSrc: "", label: "", year: "" };
  });
  return content;
}
