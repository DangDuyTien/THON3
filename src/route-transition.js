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
    if (pathname === "/admin") return "admin:/admin";
    if (COMING_SOON_PATHS.has(pathname)) return `coming-soon:${pathname}`;
    return "home:/";
  } catch {
    return "home:/";
  }
}

export function getTransitionTitle(href, fallback = "ĐANG MỞ") {
  try {
    const pathname = normalizePath(new URL(href, window.location.origin).pathname);
    return ROUTE_TITLES[pathname] || fallback;
  } catch {
    return fallback;
  }
}

export function isTransitionNavigation(anchor, currentHref = window.location.href) {
  if (!anchor?.href || anchor.hasAttribute("download")) return false;
  if (anchor.target && anchor.target.toLowerCase() !== "_self") return false;
  const destination = new URL(anchor.href, window.location.href);
  const current = new URL(currentHref, window.location.href);
  if (destination.origin !== current.origin) return false;
  if (destination.pathname === current.pathname && destination.search === current.search) return false;
  return destination.pathname !== current.pathname;
}

export { ROUTE_TITLES };
