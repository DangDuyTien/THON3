export const ADMIN_OVERVIEW = {
  id: "overview",
  label: "Tổng quan",
  description: "Toàn bộ nội dung",
  publicTarget: "home",
  index: "00",
};

export const ADMIN_SECTIONS = [
  { id: "settings", label: "Thông tin chung", description: "Tên, màu sắc, font và hiệu ứng", publicTarget: "home" },
  { id: "hero", label: "Mở đầu trang", description: "Bốn khung cảnh ở phần đầu", publicTarget: "home" },
  { id: "story", label: "Câu chuyện", description: "Lời nhắn và hình ảnh chính", publicTarget: "cau-chuyen" },
  { id: "statement", label: "Tuyên ngôn", description: "Thông điệp lớn giữa trang", publicTarget: "ban-do" },
  { id: "seasons", label: "Nhịp sống", description: "Bộ ảnh theo mùa", publicTarget: "nhung-mua" },
  { id: "visit", label: "Hai lối trở về", description: "Hai lựa chọn khám phá", publicTarget: "lien-he" },
  { id: "archive", label: "Kho ảnh tự động", description: "Chọn thư mục, tự xếp ảnh", publicTarget: "tu-lieu" },
  { id: "community", label: "Cộng đồng", description: "Đơn vị đồng hành", publicTarget: "dong-hanh" },
  { id: "updates", label: "Đang diễn ra", description: "Các hoạt động hôm nay", publicTarget: "nhip-song-hom-nay" },
  { id: "closing", label: "Theo dõi Mê Linh", description: "Phần kết, liên kết và thông tin chân trang", publicTarget: "ket-lai" },
].map((section, index) => ({ ...section, index: String(index + 1).padStart(2, "0") }));

export const ADMIN_NAV_ITEMS = [ADMIN_OVERVIEW, ...ADMIN_SECTIONS];

export function getAdminSection(id) {
  return ADMIN_NAV_ITEMS.find((section) => section.id === id) || ADMIN_OVERVIEW;
}

export function isAdminSection(id) {
  return id === "overview" || ADMIN_SECTIONS.some((section) => section.id === id);
}

export function getAdminHash(id) {
  const section = getAdminSection(id);
  return section.id === "overview" ? "#admin" : `#admin-${section.id}`;
}

export function getAdminSectionFromHash(hash = "") {
  if (hash === "#admin" || hash === "#admin-overview") return "overview";
  if (!hash.startsWith("#admin-")) return "overview";
  const id = hash.slice("#admin-".length);
  return isAdminSection(id) ? id : "overview";
}

export function getAdminPublicTarget(id) {
  return getAdminSection(id).publicTarget;
}

export function getPublicHomeHref(pathname = "/", target = "") {
  const publicPath = pathname.replace(/\/admin\/?$/, "/") || "/";
  if (!target || target === "home" || target === "top") {
    return publicPath;
  }
  return `${publicPath}#${target}`;
}
