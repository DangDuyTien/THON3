export const DEFAULT_SITE_APPEARANCE = {
  colors: {
    background: "#edf4fa",
    paper: "#f4f8fc",
    paperDeep: "#e1edf8",
    ink: "#0b1a30",
    inkSoft: "#183054",
    lime: "#0066ff",
    lake: "#00a2ff",
  },
  fonts: {
    display: "noto-serif",
    sans: "be-vietnam",
    mono: "noto-mono",
  },
  layout: {
    density: "balanced",
    frame: "wide",
    radius: "round",
  },
  effects: {
    motion: "full",
    imageTreatment: "natural",
    hover: "expressive",
  },
};

export const SITE_FONT_OPTIONS = {
  display: [
    { value: "noto-serif", label: "Noto Serif (Chuẩn Tiếng Việt - Khuyên dùng)" },
    { value: "georgia", label: "Georgia" },
    { value: "times", label: "Times New Roman" },
  ],
  sans: [
    { value: "be-vietnam", label: "Be Vietnam Pro (Chuẩn Tiếng Việt)" },
    { value: "arial", label: "Arial" },
    { value: "trebuchet", label: "Trebuchet MS" },
    { value: "verdana", label: "Verdana" },
  ],
  mono: [
    { value: "noto-mono", label: "Noto Sans Mono (Chuẩn Tiếng Việt)" },
    { value: "system-mono", label: "System Mono" },
    { value: "courier", label: "Courier New" },
  ],
};

export const SITE_APPEARANCE_OPTIONS = {
  density: [
    { value: "airy", label: "Thoáng (Kích thước lớn & nhiều khoảng thở)", hint: "Tăng khoảng cách và tỷ lệ cỡ chữ." },
    { value: "balanced", label: "Cân bằng (Mặc định)", hint: "Giữ đúng nhịp tỷ lệ chuẩn." },
    { value: "compact", label: "Gọn (Kích thước nhỏ hơn)", hint: "Thu gọn khoảng cách và dồn dặn chữ." },
  ],
  frame: [
    { value: "wide", label: "Rộng", hint: "Cho hình ảnh và tiêu đề có nhiều không gian." },
    { value: "balanced", label: "Vừa", hint: "Khung nội dung cân đối, dễ đọc." },
    { value: "focused", label: "Tập trung", hint: "Thu hẹp khung để nhấn vào nội dung." },
  ],
  radius: [
    { value: "sharp", label: "Góc vuông", hint: "Sắc nét, mang tinh thần biên tập." },
    { value: "soft", label: "Mềm nhẹ", hint: "Bo nhẹ cho các khối tương tác." },
    { value: "round", label: "Bo rõ", hint: "Cảm giác thân thiện và mềm hơn." },
  ],
  motion: [
    { value: "full", label: "Đầy đủ", hint: "Giữ toàn bộ chuyển động cuộn và tương tác." },
    { value: "calm", label: "Tối giản", hint: "Giữ chuyển cảnh nhẹ, giảm chuyển động khi cuộn." },
    { value: "off", label: "Tĩnh", hint: "Tắt animation và transition trên trang chủ." },
  ],
  imageTreatment: [
    { value: "natural", label: "Tự nhiên", hint: "Giữ màu ảnh nguyên bản." },
    { value: "soft", label: "Dịu màu", hint: "Giảm bão hòa và tương phản nhẹ." },
    { value: "vivid", label: "Nổi bật", hint: "Tăng màu và độ tương phản cho ảnh." },
  ],
  hover: [
    { value: "expressive", label: "Có tương tác", hint: "Giữ các chuyển động khi rê chuột." },
    { value: "quiet", label: "Tiết chế", hint: "Giảm độ nâng và phóng khi rê chuột." },
    { value: "off", label: "Không rê", hint: "Tắt các hiệu ứng hover." },
  ],
};

const FONT_STACKS = {
  display: {
    "noto-serif": '"Noto Serif", Georgia, serif',
    georgia: "Georgia, serif",
    times: '"Times New Roman", Times, serif',
  },
  sans: {
    "be-vietnam": '"Be Vietnam Pro", system-ui, -apple-system, sans-serif',
    arial: "Arial, Helvetica, sans-serif",
    trebuchet: '"Trebuchet MS", Arial, sans-serif',
    verdana: "Verdana, Arial, sans-serif",
  },
  mono: {
    "noto-mono": '"Noto Sans Mono", "Be Vietnam Pro", "SFMono-Regular", Consolas, monospace',
    "system-mono": '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
    courier: '"Courier New", Courier, monospace',
  },
};

const COLOR_KEYS = Object.keys(DEFAULT_SITE_APPEARANCE.colors);
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validHex(value, fallback) {
  return HEX_COLOR.test(value) ? value : fallback;
}

function rgba(hex, alpha) {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function pickOption(value, options, fallback) {
  return options.some((option) => option.value === value) ? value : fallback;
}

export function normalizeSiteAppearance(value) {
  const source = value && typeof value === "object" ? value : {};
  const colors = source.colors && typeof source.colors === "object" ? source.colors : {};
  const fonts = source.fonts && typeof source.fonts === "object" ? source.fonts : {};
  const layout = source.layout && typeof source.layout === "object" ? source.layout : {};
  const effects = source.effects && typeof source.effects === "object" ? source.effects : {};

  return {
    colors: COLOR_KEYS.reduce((result, key) => {
      let val = validHex(colors[key], DEFAULT_SITE_APPEARANCE.colors[key]);
      // Migrate legacy yellow/cyan lime to Youth Union Blue (#0066ff)
      if (key === "lime" && (val === "#d2ff00" || val === "#00f0ff")) {
        val = "#0066ff";
      }
      result[key] = val;
      return result;
    }, {}),
    fonts: {
      display: pickOption(fonts.display, SITE_FONT_OPTIONS.display, DEFAULT_SITE_APPEARANCE.fonts.display),
      sans: pickOption(fonts.sans, SITE_FONT_OPTIONS.sans, DEFAULT_SITE_APPEARANCE.fonts.sans),
      mono: pickOption(fonts.mono, SITE_FONT_OPTIONS.mono, DEFAULT_SITE_APPEARANCE.fonts.mono),
    },
    layout: {
      density: pickOption(layout.density, SITE_APPEARANCE_OPTIONS.density, DEFAULT_SITE_APPEARANCE.layout.density),
      frame: pickOption(layout.frame, SITE_APPEARANCE_OPTIONS.frame, DEFAULT_SITE_APPEARANCE.layout.frame),
      radius: pickOption(layout.radius, SITE_APPEARANCE_OPTIONS.radius, DEFAULT_SITE_APPEARANCE.layout.radius),
    },
    effects: {
      motion: pickOption(effects.motion, SITE_APPEARANCE_OPTIONS.motion, DEFAULT_SITE_APPEARANCE.effects.motion),
      imageTreatment: pickOption(effects.imageTreatment, SITE_APPEARANCE_OPTIONS.imageTreatment, DEFAULT_SITE_APPEARANCE.effects.imageTreatment),
      hover: pickOption(effects.hover, SITE_APPEARANCE_OPTIONS.hover, DEFAULT_SITE_APPEARANCE.effects.hover),
    },
  };
}

export function getSiteAppearanceStyle(value) {
  const appearance = normalizeSiteAppearance(value);
  const { colors, fonts, layout, effects } = appearance;
  const density = { airy: 1.14, balanced: 1, compact: 0.86 }[layout.density];
  const frame = { wide: 1.08, balanced: 1, focused: 0.86 }[layout.frame];
  const radius = { sharp: "0px", soft: "4px", round: "8px" }[layout.radius];

  return {
    "--page-background": colors.background,
    "--paper": colors.paper,
    "--paper-deep": colors.paperDeep,
    "--ink": colors.ink,
    "--ink-soft": colors.inkSoft,
    "--lime": colors.lime,
    "--lake": colors.lake,
    "--line": rgba(colors.ink, 0.16),
    "--line-light": rgba(colors.paper, 0.24),
    "--display": FONT_STACKS.display[fonts.display],
    "--sans": FONT_STACKS.sans[fonts.sans],
    "--mono": FONT_STACKS.mono[fonts.mono],
    "--layout-density": density,
    "--layout-frame-scale": frame,
    "--layout-radius": radius,
    "--image-saturation": effects.imageTreatment === "soft" ? 0.86 : effects.imageTreatment === "vivid" ? 1.14 : 1,
    "--image-contrast": effects.imageTreatment === "soft" ? 0.96 : effects.imageTreatment === "vivid" ? 1.06 : 1,
  };
}

export function getSiteAppearanceClassName(value) {
  const appearance = normalizeSiteAppearance(value);
  return [
    `theme-density-${appearance.layout.density}`,
    `theme-frame-${appearance.layout.frame}`,
    `theme-radius-${appearance.layout.radius}`,
    `theme-motion-${appearance.effects.motion}`,
    `theme-image-${appearance.effects.imageTreatment}`,
    `theme-hover-${appearance.effects.hover}`,
  ].join(" ");
}

export function cloneDefaultSiteAppearance() {
  return clone(DEFAULT_SITE_APPEARANCE);
}
