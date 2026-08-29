export const storyFrames = [
  {
    imageSrc: "/assets/village-hero.jpg",
    colorVariant: "hero-home",
    position: "center 58%",
  },
];

// Dữ liệu mặc định được nạp vào lớp nội dung và có thể ghi đè từ khu vực admin.
export const villageMessage = {
  eyebrow: "LỜI NHẮN TỪ MÊ LINH",
  imageAlt: "Phong cảnh và một con đường nhỏ dẫn vào làng Mê Linh, Hà Nội.",
  imagePosition: "center 58%",
  imageSrc: "/assets/village-hero.jpg",
  colorVariant: "story-message",
  headlineBottom: "TRỞ VỀ VÀ Ở LẠI",
  headlineTop: "CÓ MỘT NƠI ĐỂ",
  signatureAlt: "Chữ ký Xã Mê Linh, Hà Nội",
  signatureImage: null,
  signatureText: "Mê Linh",
  summary: "Từ mặt nước, đường làng và những nếp nhà, một câu chuyện riêng dần hiện ra.",
};

export const exploreStatement = {
  eyebrow: "MÊ LINH / HÀ NỘI",
  lines: [
    { accent: "ĐI QUA", after: "LỐI NHỎ," },
    { before: "GIỮ", accent: "BÌNH YÊN," },
    { before: "MỖI BƯỚC", accent: "VỀ LÀNG" },
    { accent: "LƯU LẠI", after: "KỶ NIỆM." },
  ],
};

export const seasonalGallery = {
  eyebrow: "NHỊP SỐNG / MÊ LINH",
  quote: "Mỗi mùa mở ra một nhịp gặp gỡ, để người về làng có thêm điều để nhớ.",
  signature: "Mê Linh",
  photos: [
    { id: "lane", imageAlt: "Dãy núi và mặt nước nhìn từ lối vào Mê Linh.", imagePosition: "18% 55%", imageSrc: "/assets/village-hero.jpg", label: "LỐI VÀO LÀNG, SỚM" },
    { colorVariant: "gallery-mono", id: "market", imageAlt: "Bãi đá và những mái chòi ven nước ở Mê Linh.", imagePosition: "34% 68%", imageSrc: "/assets/village-hero.jpg", label: "BẾN NƯỚC, CHIỀU" },
    { id: "feature", imageAlt: "Toàn cảnh mặt nước xanh, núi đá và bãi nhỏ của Mê Linh.", imagePosition: "54% 58%", imageSrc: "/assets/village-hero.jpg", label: "MIỀN NƯỚC XANH, HÔM NAY" },
    { colorVariant: "gallery-mono", id: "water", imageAlt: "Vách núi soi xuống mặt nước của Mê Linh.", imagePosition: "78% 40%", imageSrc: "/assets/village-hero.jpg", label: "VEN VỊNH, THÁNG 6" },
    { colorVariant: "gallery-vivid", id: "field", imageAlt: "Mặt nước trong và các dãy đá của Mê Linh.", imagePosition: "68% 84%", imageSrc: "/assets/village-hero.jpg", label: "MÙA NƯỚC LÊN, 2026" },
    { colorVariant: "gallery-warm", id: "rice", imageAlt: "Bờ núi xanh nhìn ra vùng quê Mê Linh.", imagePosition: "12% 38%", imageSrc: "/assets/village-hero.jpg", label: "ĐỒI XANH, ĐẦU MÙA" },
    { colorVariant: "gallery-vivid", id: "harvest", imageAlt: "Mặt nước và bãi đá ở Mê Linh trong nắng.", imagePosition: "48% 70%", imageSrc: "/assets/village-hero.jpg", label: "MỘT BUỔI TRƯA Ở LÀNG" },
    { colorVariant: "gallery-mono", id: "festival", imageAlt: "Dãy núi và mặt nước xanh ở Mê Linh.", imagePosition: "90% 46%", imageSrc: "/assets/village-hero.jpg", label: "NGÀY HỘI, CUỐI NĂM" },
  ],
};

export const visitChoices = {
  gate: {
    imageAlt: "Cổng trại Chi đội Thôn 3 Hạ Lôi.",
    imageSrc: "/assets/camp-gate-thon3-user-4k-cutout.png",
  },
  left: {
    actionLabel: "Đi vào câu chuyện Mê Linh",
    copy: "Bắt đầu từ bến nước, rồi để những lối nhỏ dẫn bạn qua câu chuyện của làng.",
    href: "/cau-chuyen",
    kicker: "BẾN NƯỚC / MÊ LINH",
    lower: "LÀNG",
    upper: "VỀ LẠI",
  },
  right: {
    actionLabel: "Khám phá nhịp sống Mê Linh",
    copy: "Ở lại thêm một mùa để gặp chợ sớm, mặt nước và những nhịp sống thường ngày.",
    href: "/nhung-mua",
    kicker: "MÊ LINH / HÀ NỘI",
    lower: "MỘT MÙA",
    upper: "Ở LẠI",
  },
  caption: "MÊ LINH / HAI LỐI TRỞ VỀ",
};

export const fullBleedArrival = {
  eyebrow: "MỘT NƠI ĐỂ TRỞ VỀ / HÀ NỘI",
  headline: ["LUÔN CÓ", "MỘT LỐI VỀ."],
  portraitSrc: "",
  portraitAlt: "",
  imageAlt: "Toàn cảnh phong cảnh làng quê Mê Linh, Hà Nội.",
  imagePosition: "center 58%",
  imageSrc: "/assets/village-hero.jpg",
};

export const closing = {
  transitionKicker: "CỘNG ĐỒNG / MÊ LINH",
  transitionTitle: "Theo dõi Mê Linh",
  socialItems: [
    { label: "Facebook", href: "/dong-hanh" },
    { label: "Instagram", href: "/dong-hanh" },
    { label: "YouTube", href: "/dong-hanh" },
    { label: "TikTok", href: "/dong-hanh" },
  ],
  visitLabel: "GHÉ MÊ LINH",
  navLabel: "TRANG",
  navItems: [
    { label: "Trang chủ", href: "/" },
    { label: "Câu chuyện", href: "/cau-chuyen" },
    { label: "Nhịp sống", href: "/nhung-mua" },
    { label: "Tư liệu", href: "/tu-lieu" },
    { label: "Cộng đồng", href: "/dong-hanh" },
  ],
  networkLabel: "THEO DÕI",
  networkItems: [
    { label: "Mê Linh", href: "/" },
    { label: "Hà Nội", href: "/lien-he" },
    { label: "Kết nối", href: "/dong-hanh" },
  ],
  contactLabel: "KẾT NỐI CÙNG MÊ LINH",
  contactHref: "/dong-hanh",
  copyrightTemplate: "BẢN QUYỀN © 2026 {siteName}",
  designCredit: "THIẾT KẾ ĐỘC BẢN • HÀ NỘI",
};

export const villageArchive = {
  eyebrow: "ĐOÀN THANH NIÊN / MÊ LINH",
  title: "GƯƠNG MẶT\nTUỔI TRẺ MÊ LINH",
  intro: "Gặp những gương mặt đang kết nối sức trẻ, hoạt động cộng đồng và tinh thần đồng hành tại Mê Linh.",
  cards: [
    { colorVariant: "archive-default", id: "member1", label: "", year: "", bio: "", imageAlt: "", imagePosition: "center 30%", size: "medium" },
    { colorVariant: "archive-default", id: "member2", label: "", year: "", bio: "", imageAlt: "", imagePosition: "center 30%", size: "medium" },
    { colorVariant: "archive-default", id: "member3", label: "", year: "", bio: "", imageAlt: "", imagePosition: "center 30%", size: "medium" },
    { colorVariant: "archive-default", id: "member4", label: "", year: "", imageAlt: "", imagePosition: "center 30%", size: "medium" },
    { colorVariant: "archive-default", id: "member5", label: "", year: "", imageAlt: "", imagePosition: "center 30%", size: "medium" },
    { colorVariant: "archive-default", id: "member6", label: "", year: "", imageAlt: "", imagePosition: "center 30%", size: "medium" },
    { colorVariant: "archive-default", id: "member7", label: "", year: "", imageAlt: "", imagePosition: "center 30%", size: "medium" },
    { colorVariant: "archive-default", id: "member8", label: "", year: "", imageAlt: "", imagePosition: "center 30%", size: "medium" },
  ],
};

export const communityPartners = {
  copy: "Đoàn Thanh niên cùng các tổ chức tại địa phương kết nối sức trẻ, gìn giữ cảnh quan và mở thêm những hoạt động có ích cho người dân Mê Linh.",
  eyebrow: "CỘNG ĐỒNG / MÊ LINH",
  headline: ["CỘNG ĐỒNG", "& ĐỒNG HÀNH"],
  organizations: [
    { id: "youth-union", label: "ĐOÀN TNCS HỒ CHÍ MINH", logo: "/assets/doan-tncs-logo-960.webp", logoAlt: "Biểu trưng Đoàn Thanh niên Cộng sản Hồ Chí Minh", type: "emblem" },
    { id: "ubnd", label: "UBND XÃ", logo: "/assets/community-ubnd.svg", logoAlt: "Biểu trưng UBND Xã Mê Linh", mark: "UBND" },
    { id: "fatherland-front", label: "MẶT TRẬN TỔ QUỐC", logo: "/assets/community-mttq.svg", logoAlt: "Biểu trưng Mặt trận Tổ quốc", mark: "MTTQ" },
    { id: "women-union", label: "HỘI LIÊN HIỆP PHỤ NỮ", logo: "/assets/community-hpn.svg", logoAlt: "Biểu trưng Hội Liên hiệp Phụ nữ", mark: "HPN" },
    { id: "farmers-union", label: "HỘI NÔNG DÂN", logo: "/assets/community-hnd.svg", logoAlt: "Biểu trưng Hội Nông dân", mark: "HND" },
    { id: "school", label: "TRƯỜNG HỌC ĐỊA PHƯƠNG", logo: "/assets/community-th.svg", logoAlt: "Biểu trưng trường học địa phương", mark: "TH" },
    { id: "cooperative", label: "TỔ HỢP TÁC", logo: "/assets/community-htx.svg", logoAlt: "Biểu trưng Tổ hợp tác", mark: "HTX" },
  ],
};

export const villageUpdates = {
  eyebrow: "NHỊP SỐNG / HÔM NAY",
  headline: ["CHUYỆN GÌ ĐANG XẢY RA", "Ở MÊ LINH"],
  imageSrc: "/assets/village-hero.jpg",
  cards: [
    { id: "morning-market", label: "CHỢ SỚM", meta: "06:30", imageAlt: "Mặt nước Mê Linh vào buổi sớm.", imagePosition: "12% 68%", tone: "soft" },
    { id: "clean-water", label: "LÀM SẠCH BẾN NƯỚC", meta: "THỨ BẢY", imageAlt: "Dãy núi và bến nước của Mê Linh.", imagePosition: "31% 56%", tone: "mono" },
    { id: "green-path", label: "LỐI NHỎ XANH", meta: "HÔM NAY", imageAlt: "Lối vào và mặt nước ở Mê Linh.", imagePosition: "51% 52%", tone: "vivid" },
    { id: "children", label: "GÓC THIẾU NHI", meta: "15:00", imageAlt: "Bãi nhỏ dưới chân núi Mê Linh.", imagePosition: "70% 76%", tone: "warm" },
    { id: "planting", label: "TRỒNG MỘT HÀNG CÂY", meta: "CHỦ NHẬT", imageAlt: "Những dãy núi xanh tại Mê Linh.", imagePosition: "83% 42%", tone: "soft" },
    { id: "story-night", label: "ĐÊM KỂ CHUYỆN LÀNG", meta: "19:30", imageAlt: "Mặt nước Mê Linh trong chiều muộn.", imagePosition: "42% 84%", tone: "mono" },
  ],
};
