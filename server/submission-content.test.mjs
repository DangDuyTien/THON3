import assert from "node:assert/strict";
import test from "node:test";
import { appendApprovedSubmissionCard, buildApprovedSubmissionCard } from "./submission-content.mjs";
import { isValidYouthBirthYear, isYouthSchoolOption } from "../src/lib/submission-options.js";

test("duyệt đăng ký tạo thẻ Gương mặt tuổi trẻ ổn định từ dữ liệu máy chủ", () => {
  const card = buildApprovedSubmissionCard({
    id: 42,
    name: "Nguyễn Văn An",
    age: "2008",
    school: "THPT Mê Linh",
    image_asset_id: "image-id",
    alt_image_asset_id: "hover-id",
    image_src: "https://ik.imagekit.io/example/main.jpg",
    alt_image_src: "https://ik.imagekit.io/example/hover.jpg",
  });
  assert.equal(card.id, "submission-42");
  assert.equal(card.label, "Nguyễn Văn An");
  assert.equal(card.year, "2008 • THPT Mê Linh • Đoàn viên");
  assert.equal(card.imageSrc, "https://ik.imagekit.io/example/main.jpg");
  assert.equal(card.altImageSrc, "https://ik.imagekit.io/example/hover.jpg");
  assert.equal(card.size, "medium");
});

test("đăng ký chỉ nhận năm sinh và trường học trong danh sách", () => {
  assert.equal(isValidYouthBirthYear("2008", 2026), true);
  assert.equal(isValidYouthBirthYear("21 tuổi", 2026), false);
  assert.equal(isValidYouthBirthYear("2030", 2026), false);
  assert.equal(isYouthSchoolOption("THPT Tiền Phong"), true);
  assert.equal(isYouthSchoolOption("Đơn vị tự nhập"), false);
});

test("thẻ được nối đúng một lần mà không sửa object nội dung cũ", () => {
  const content = { villageArchive: { title: "Gương mặt", cards: [{ id: "existing" }] } };
  const card = { id: "submission-7", label: "Thẻ mới" };
  const next = appendApprovedSubmissionCard(content, card);
  assert.deepEqual(content.villageArchive.cards, [{ id: "existing" }]);
  assert.deepEqual(next.villageArchive.cards, [{ id: "existing" }, card]);
  assert.throws(() => appendApprovedSubmissionCard(next, card), /đã có trong danh sách/);
});
