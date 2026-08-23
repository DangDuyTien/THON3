import { YOUTH_MEMBER_ROLE } from "../src/lib/submission-options.js";

export function buildApprovedSubmissionCard(submission) {
  const id = Number(submission?.id);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Yêu cầu đăng ký không hợp lệ.");
  return {
    colorVariant: "archive-default",
    id: `submission-${id}`,
    label: String(submission.name || "").trim(),
    year: `${String(submission.age || "").trim()} • ${String(submission.school || "").trim()} • ${YOUTH_MEMBER_ROLE}`,
    imageAlt: `Đoàn viên ${String(submission.name || "").trim()}`,
    imagePosition: "center 30%",
    imageSrc: submission.image_src || `/api/media/${submission.image_asset_id}`,
    altImageSrc: submission.alt_image_asset_id
      ? (submission.alt_image_src || `/api/media/${submission.alt_image_asset_id}`)
      : "",
    size: "medium",
  };
}

export function appendApprovedSubmissionCard(content, card) {
  const cards = content?.villageArchive?.cards;
  if (!Array.isArray(cards)) throw new Error("Nội dung Gương mặt tuổi trẻ chưa sẵn sàng để nhận thẻ mới.");
  if (cards.some((item) => item?.id === card.id)) {
    const error = new Error("Đăng ký này đã có trong danh sách Gương mặt tuổi trẻ.");
    error.statusCode = 409;
    throw error;
  }
  return {
    ...content,
    villageArchive: {
      ...content.villageArchive,
      cards: [...cards, card],
    },
  };
}
