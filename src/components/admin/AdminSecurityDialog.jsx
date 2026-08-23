import { Clock3, History, Image, KeyRound, LogOut, RefreshCw, RotateCcw, ShieldCheck, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  confirmMfaEnrollment,
  disableMfa,
  getSecurityStatus,
  listAuditLogs,
  listContentRevisions,
  requestMfaEnrollment,
  restoreContentRevision,
  revokeAllSessions,
} from "../../lib/security-api.js";
import { createSignedMediaUrl, listDeletedMediaAssets, restoreMedia } from "../../lib/media-api.js";

const ACTION_LABELS = {
  "auth.login": "Đăng nhập",
  "auth.login_mfa": "Đăng nhập bằng mã OTP",
  "auth.logout": "Đăng xuất",
  "auth.login_challenge": "Yêu cầu mã đăng nhập",
  "auth.password_changed": "Đổi mật khẩu",
  "auth.password_recovered": "Khôi phục mật khẩu",
  "auth.recovery_requested": "Yêu cầu khôi phục",
  "auth.sessions_revoked": "Thu hồi mọi phiên",
  "auth.mfa_requested": "Yêu cầu bật xác thực hai bước",
  "auth.mfa_enabled": "Bật xác thực hai bước",
  "auth.mfa_disabled": "Tắt xác thực hai bước",
  "content.published": "Xuất bản nội dung",
  "content.restored": "Khôi phục phiên bản",
  "content.draft_deleted": "Xóa bản nháp",
  "media.uploaded": "Tải ảnh lên",
  "media.deleted": "Đưa ảnh vào thùng rác",
  "media.restored": "Khôi phục ảnh",
  "submission.approved": "Duyệt bài gửi",
  "submission.rejected": "Từ chối bài gửi",
};

function formatDate(value) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function AdminSecurityDialog({ onClose, onContentRestored, onSessionRevoked }) {
  const [activeTab, setActiveTab] = useState("account");
  const [status, setStatus] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [deletedMedia, setDeletedMedia] = useState([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [otpCode, setOtpCode] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setError("");
    const [statusResult, revisionResult, auditResult, deletedMediaResult] = await Promise.allSettled([
      getSecurityStatus(),
      listContentRevisions(),
      listAuditLogs(),
      listDeletedMediaAssets(),
    ]);
    if (statusResult.status === "fulfilled") setStatus(statusResult.value);
    else setError(statusResult.reason?.message || "Không thể tải trạng thái bảo mật.");
    if (revisionResult.status === "fulfilled") setRevisions(revisionResult.value);
    if (auditResult.status === "fulfilled") setAuditLogs(auditResult.value);
    if (deletedMediaResult.status === "fulfilled") setDeletedMedia(deletedMediaResult.value);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const runAction = async (name, action) => {
    setBusyAction(name);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (actionError) {
      setError(actionError?.message || "Không thể hoàn tất thao tác bảo mật.");
    } finally {
      setBusyAction("");
    }
  };

  const handleRequestMfa = () => runAction("mfa-request", async () => {
    if (!currentPassword) throw new Error("Hãy nhập mật khẩu hiện tại.");
    const challenge = await requestMfaEnrollment(currentPassword);
    setMfaChallenge(challenge);
    setOtpCode("");
    setMessage(`Mã xác thực đã được gửi tới ${challenge.maskedEmail}.`);
  });

  const handleConfirmMfa = () => runAction("mfa-confirm", async () => {
    if (!/^\d{8}$/.test(otpCode)) throw new Error("Mã xác thực phải gồm 8 chữ số.");
    const result = await confirmMfaEnrollment(mfaChallenge.challengeId, otpCode);
    setStatus((current) => ({ ...current, ...result.security, emailOtpEnabled: true }));
    setMfaChallenge(null);
    setOtpCode("");
    setCurrentPassword("");
    setMessage("Đã bật xác thực hai bước bằng email.");
    await loadData();
  });

  const handleDisableMfa = () => runAction("mfa-disable", async () => {
    if (!currentPassword) throw new Error("Hãy nhập mật khẩu hiện tại.");
    if (!window.confirm("Tắt xác thực hai bước cho tài khoản này?")) return;
    const result = await disableMfa(currentPassword);
    setStatus((current) => ({ ...current, ...result.security, emailOtpEnabled: false }));
    setCurrentPassword("");
    setMessage("Đã tắt xác thực hai bước.");
    await loadData();
  });

  const handleRevokeSessions = () => runAction("revoke", async () => {
    if (!currentPassword) throw new Error("Hãy nhập mật khẩu hiện tại.");
    if (!window.confirm("Đăng xuất tài khoản khỏi tất cả thiết bị, bao gồm thiết bị này?")) return;
    await revokeAllSessions(currentPassword);
    onSessionRevoked();
  });

  const handleRestore = (version) => runAction(`restore-${version}`, async () => {
    if (!currentPassword) throw new Error("Nhập mật khẩu hiện tại ở thẻ Tài khoản trước khi khôi phục.");
    if (!window.confirm(`Khôi phục nội dung từ phiên bản ${version}? Hệ thống vẫn lưu bản hiện tại thành lịch sử.`)) return;
    const result = await restoreContentRevision(version, currentPassword);
    setMessage(`Đã khôi phục phiên bản ${version} và tạo phiên bản mới ${result.version}.`);
    onContentRestored(result);
    await loadData();
  });

  const handleRestoreMedia = (asset) => runAction(`media-${asset.id}`, async () => {
    await restoreMedia(asset);
    setDeletedMedia((current) => current.filter((item) => item.id !== asset.id));
    setMessage(`Đã khôi phục ảnh ${asset.original_name}.`);
    await loadData();
  });

  return (
    <div className="admin-password-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busyAction) onClose(); }}>
      <section className="admin-password-modal admin-security-modal" role="dialog" aria-modal="true" aria-labelledby="admin-security-title">
        <header className="admin-password-modal-header">
          <div>
            <p className="admin-panel-eyebrow">BẢO MẬT & KHÔI PHỤC</p>
            <h2 id="admin-security-title">Trung tâm bảo mật</h2>
            <p>Quản lý xác thực, phiên đăng nhập và lịch sử thay đổi dữ liệu.</p>
          </div>
          <button className="admin-password-modal-close" type="button" onClick={onClose} disabled={Boolean(busyAction)} aria-label="Đóng trung tâm bảo mật"><X aria-hidden="true" /></button>
        </header>

        <div className="admin-security-tabs" role="tablist" aria-label="Nội dung bảo mật">
          <button type="button" role="tab" aria-selected={activeTab === "account"} className={activeTab === "account" ? "is-active" : ""} onClick={() => setActiveTab("account")}><ShieldCheck aria-hidden="true" />Tài khoản</button>
          <button type="button" role="tab" aria-selected={activeTab === "history"} className={activeTab === "history" ? "is-active" : ""} onClick={() => setActiveTab("history")}><History aria-hidden="true" />Phiên bản</button>
          <button type="button" role="tab" aria-selected={activeTab === "media"} className={activeTab === "media" ? "is-active" : ""} onClick={() => setActiveTab("media")}><Image aria-hidden="true" />Ảnh đã xóa</button>
          <button type="button" role="tab" aria-selected={activeTab === "audit"} className={activeTab === "audit" ? "is-active" : ""} onClick={() => setActiveTab("audit")}><Clock3 aria-hidden="true" />Nhật ký</button>
        </div>

        {error && <p className="admin-media-message is-error" role="alert">{error}</p>}
        {message && <p className="admin-media-message" role="status">{message}</p>}

        <div className="admin-security-body">
          {activeTab === "account" && (
            <div className="admin-security-account" role="tabpanel">
              <dl className="admin-security-summary">
                <div><dt>Xác thực hai bước</dt><dd>{status?.emailOtpEnabled ? "Đang bật" : "Chưa bật"}</dd></div>
                <div><dt>Email nhận mã</dt><dd>{status?.maskedEmail || "Đang tải..."}</dd></div>
                <div><dt>Phiên đăng nhập</dt><dd>{status ? `${Math.round(status.sessionExpiresInSeconds / 3600)} giờ` : "Đang tải..."}</dd></div>
                <div><dt>Đăng nhập gần nhất</dt><dd>{formatDate(status?.lastLoginAt)}</dd></div>
              </dl>

              <label className="admin-field">
                <span className="admin-field-label">Mật khẩu hiện tại</span>
                <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" />
              </label>

              {mfaChallenge ? (
                <div className="admin-security-mfa-confirm">
                  <label className="admin-field">
                    <span className="admin-field-label">Mã email gồm 8 chữ số</span>
                    <input type="text" inputMode="numeric" pattern="[0-9]{8}" maxLength="8" value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 8))} autoComplete="one-time-code" />
                  </label>
                  <button className="admin-primary-button admin-icon-text-button" type="button" onClick={handleConfirmMfa} disabled={Boolean(busyAction)}><ShieldCheck aria-hidden="true" /><span>{busyAction === "mfa-confirm" ? "Đang xác nhận..." : "Xác nhận bật 2 bước"}</span></button>
                </div>
              ) : (
                <div className="admin-security-actions">
                  {status?.emailOtpEnabled ? (
                    <button className="admin-secondary-button admin-icon-text-button" type="button" onClick={handleDisableMfa} disabled={Boolean(busyAction) || status?.emailOtpRequiredByServer}><KeyRound aria-hidden="true" /><span>Tắt xác thực hai bước</span></button>
                  ) : (
                    <button className="admin-primary-button admin-icon-text-button" type="button" onClick={handleRequestMfa} disabled={Boolean(busyAction) || !status?.emailDeliveryConfigured}><ShieldCheck aria-hidden="true" /><span>{busyAction === "mfa-request" ? "Đang gửi mã..." : "Bật xác thực hai bước"}</span></button>
                  )}
                  <button className="admin-secondary-button admin-icon-text-button is-danger" type="button" onClick={handleRevokeSessions} disabled={Boolean(busyAction)}><LogOut aria-hidden="true" /><span>Đăng xuất mọi thiết bị</span></button>
                </div>
              )}
              {status && !status.emailDeliveryConfigured && <p className="admin-security-note">Máy chủ email chưa sẵn sàng nên chưa thể bật xác thực hai bước hoặc khôi phục qua email.</p>}
            </div>
          )}

          {activeTab === "history" && (
            <div className="admin-security-list" role="tabpanel">
              <label className="admin-field admin-security-restore-password">
                <span className="admin-field-label">Mật khẩu hiện tại để khôi phục</span>
                <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" />
              </label>
              {revisions.length === 0 && <p className="admin-security-empty">Chưa có lịch sử xuất bản.</p>}
              {revisions.map((revision) => (
                <div className="admin-security-row" key={revision.version}>
                  <span><strong>Phiên bản {revision.version}</strong><small>{formatDate(revision.created_at)} · {revision.display_name || revision.email || "Hệ thống"}</small></span>
                  <button type="button" onClick={() => handleRestore(revision.version)} disabled={Boolean(busyAction)} title={`Khôi phục phiên bản ${revision.version}`}><RotateCcw aria-hidden="true" /></button>
                </div>
              ))}
            </div>
          )}

          {activeTab === "audit" && (
            <div className="admin-security-list" role="tabpanel">
              {auditLogs.length === 0 && <p className="admin-security-empty">Chưa có hoạt động được ghi nhận.</p>}
              {auditLogs.map((entry) => (
                <div className="admin-security-row" key={entry.id}>
                  <span><strong>{ACTION_LABELS[entry.action] || entry.action}</strong><small>{formatDate(entry.created_at)} · {entry.display_name || entry.email || "Hệ thống"}</small></span>
                  <small>{entry.entity_id || entry.entity_type}</small>
                </div>
              ))}
            </div>
          )}

          {activeTab === "media" && (
            <div className="admin-security-list" role="tabpanel">
              {deletedMedia.length === 0 && <p className="admin-security-empty">Thùng rác ảnh đang trống.</p>}
              {deletedMedia.map((asset) => (
                <div className="admin-security-row admin-security-media-row" key={asset.id}>
                  {asset.storage_provider === "imagekit" ? <img src={createSignedMediaUrl(asset)} alt="" /> : <span className="admin-security-media-placeholder"><Image aria-hidden="true" /></span>}
                  <span><strong>{asset.original_name}</strong><small>Đã xóa {formatDate(asset.deleted_at)}</small></span>
                  <button type="button" onClick={() => handleRestoreMedia(asset)} disabled={Boolean(busyAction)} title={`Khôi phục ${asset.original_name}`}><RotateCcw aria-hidden="true" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="admin-password-modal-footer">
          <button className="admin-secondary-button admin-icon-text-button" type="button" onClick={loadData} disabled={Boolean(busyAction)}><RefreshCw aria-hidden="true" /><span>Làm mới</span></button>
          <button className="admin-primary-button" type="button" onClick={onClose} disabled={Boolean(busyAction)}>Đóng</button>
        </footer>
      </section>
    </div>
  );
}
