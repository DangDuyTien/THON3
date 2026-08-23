export const YOUTH_MEMBER_ROLE = "Đoàn viên";

export const YOUTH_SCHOOL_OPTIONS = Object.freeze([
  "THPT Tiền Phong",
  "THPT Mê Linh",
  "FPT Polytechnic",
]);

export function isValidYouthBirthYear(value, currentYear = new Date().getFullYear()) {
  const normalized = String(value || "").trim();
  if (!/^\d{4}$/.test(normalized)) return false;
  const year = Number(normalized);
  return year >= 1900 && year <= currentYear;
}

export function isYouthSchoolOption(value) {
  return YOUTH_SCHOOL_OPTIONS.includes(String(value || "").trim());
}
