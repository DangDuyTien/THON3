const ROUTE_TITLES = {
  "/": "TRANG CHỦ",
  "/cau-chuyen": "CÂU CHUYỆN",
  "/nhung-mua": "NHỊP SỐNG",
  "/ban-do": "BẢN ĐỒ",
  "/dong-hanh": "CỘNG ĐỒNG",
  "/tu-lieu": "KHO LƯU TRỮ",
  "/kho-luu-tru": "KHO LƯU TRỮ",
  "/ket-lai": "THEO DÕI MÊ LINH",
  "/lien-he": "GHÉ THĂM",
  "/admin": "QUẢN TRỊ NỘI DUNG",
};

const HASH_TITLES = {
  "#home": "TRANG CHỦ",
  "#cau-chuyen": "CÂU CHUYỆN",
  "#nhung-mua": "NHỊP SỐNG",
  "#ban-do": "BẢN ĐỒ",
  "#dong-hanh": "CỘNG ĐỒNG",
  "#tu-lieu": "KHO LƯU TRỮ",
  "#ket-lai": "THEO DÕI MÊ LINH",
  "#lien-he": "GHÉ THĂM",
};

const TRANSITION_HASHES = new Set([
  ...Object.keys(HASH_TITLES),
  "#admin",
]);

const COMING_SOON_PATHS = new Set([
  "/cau-chuyen",
  "/nhung-mua",
  "/ban-do",
  "/dong-hanh",
  "/tu-lieu",
  "/kho-luu-tru",
  "/ket-lai",
  "/lien-he",
  "/tin-tuc",
  "/sap-ra-mat",
  "/coming-soon",
]);

export function normalizePath(pathname = "/") {
  const path = String(pathname || "/").replace(/\/+$/, "");
  return path || "/";
}

export function getRouteKeyFromSnapshot(snapshot) {
  if (!snapshot) return "home:/";
  if (snapshot.type === "admin") return "admin:/admin";
  return `${snapshot.type}:${normalizePath(snapshot.route)}`;
}

export function getRouteKeyForHref(href, origin = window.location.origin) {
  try {
    const url = new URL(href, origin);
    const pathname = normalizePath(url.pathname);
    if (pathname === "/admin" || url.hash === "#admin" || url.hash.startsWith("#admin-")) return "admin:/admin";
    if (COMING_SOON_PATHS.has(pathname)) return `coming-soon:${pathname}`;
    return "home:/";
  } catch {
    return "home:/";
  }
}

export function getTransitionTitle(href, fallback = "ĐANG MỞ") {
  try {
    const url = new URL(href, window.location.origin);
    const hashTitle = HASH_TITLES[url.hash.toLowerCase()];
    return hashTitle || ROUTE_TITLES[normalizePath(url.pathname)] || fallback;
  } catch {
    return fallback;
  }
}

export function isTransitionNavigation(anchor, currentHref = window.location.href) {
  if (!anchor?.href || anchor.hasAttribute("download")) return false;
  if (anchor.target && anchor.target.toLowerCase() !== "_self") return false;
  const destination = new URL(anchor.href, currentHref);
  const current = new URL(currentHref, currentHref);
  if (destination.origin !== current.origin) return false;
  if (destination.pathname === current.pathname && destination.search === current.search && destination.hash === current.hash) return false;
  if (destination.pathname !== current.pathname || destination.search !== current.search) return true;
  return TRANSITION_HASHES.has(destination.hash.toLowerCase())
    || destination.hash.toLowerCase().startsWith("#admin-");
}

export { HASH_TITLES, ROUTE_TITLES };
