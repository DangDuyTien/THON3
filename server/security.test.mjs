import assert from "node:assert/strict";
import { after, test } from "node:test";

process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "test-session-secret-with-more-than-forty-eight-random-characters-123456";

const auth = await import("./auth.mjs");
const { validateContentPayload } = await import("./security.mjs");
const { pool } = await import("./db.mjs");

after(async () => {
  await pool.end();
});

test("mật khẩu quản trị chỉ nhận 16 đến 18 chữ số", () => {
  assert.equal(auth.validateAdminPassword("1234567890123456"), "1234567890123456");
  assert.equal(auth.validateAdminPassword("123456789012345678"), "123456789012345678");
  assert.throws(() => auth.validateAdminPassword("123456789012345"), /16 đến 18/);
  assert.throws(() => auth.validateAdminPassword("123456789012345a"), /16 đến 18/);
});

test("CSRF token đúng phiên được chấp nhận và token giả bị từ chối", () => {
  const token = auth.issueSession({ id: 1, session_version: 1 });
  const csrfToken = auth.issueCsrfToken(token);
  let nextCalled = false;
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
  auth.requireCsrf({ cookies: { [auth.SESSION_COOKIE]: token }, get: () => csrfToken }, response, () => { nextCalled = true; });
  assert.equal(nextCalled, true);

  nextCalled = false;
  auth.requireCsrf({ cookies: { [auth.SESSION_COOKIE]: token }, get: () => "invalid" }, response, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(response.statusCode, 403);
});

test("nội dung CMS từ chối protocol nguy hiểm và data SVG", () => {
  assert.equal(validateContentPayload({ settings: { logo: "data:image/png;base64,AAAA", href: "https://example.com" } }).settings.href, "https://example.com");
  assert.throws(() => validateContentPayload({ closing: { href: "javascript:alert(1)" } }), /không an toàn/);
  assert.throws(() => validateContentPayload({ settings: { imageSrc: "data:image/svg+xml;base64,PHN2Zy8+" } }), /không an toàn/);
});
