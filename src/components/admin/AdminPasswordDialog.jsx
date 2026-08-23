import { Eye, EyeOff, KeyRound, X } from "lucide-react";
import { useState } from "react";
import { changePassword } from "../../lib/auth-api.js";

export default function AdminPasswordDialog({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!/^\d{12,18}$/.test(newPassword)) {
      setError("Mật khẩu mới phải gồm 12 đến 18 chữ số.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới nhập lại chưa khớp.");
      return;
    }
    setBusy(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Đã đổi mật khẩu. Lần đăng nhập sau hãy dùng mật khẩu mới.");
    } catch (changeError) {
      setError(changeError?.message || "Không thể đổi mật khẩu.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-password-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section className="admin-password-modal" role="dialog" aria-modal="true" aria-labelledby="admin-password-title">
        <header className="admin-password-modal-header">
          <div>
            <p className="admin-panel-eyebrow">BẢO MẬT TÀI KHOẢN</p>
            <h2 id="admin-password-title">Đổi mật khẩu admin</h2>
            <p>Dùng dãy số ngẫu nhiên dài 12–18 số. Mật khẩu không được lưu trong mã nguồn.</p>
          </div>
          <button className="admin-password-modal-close" type="button" onClick={onClose} disabled={busy} aria-label="Đóng đổi mật khẩu">
            <X aria-hidden="true" />
          </button>
        </header>
        <form className="admin-password-form" onSubmit={handleSubmit}>
          {error && <p className="admin-media-message is-error" role="alert">{error}</p>}
          {message && <p className="admin-media-message" role="status">{message}</p>}
          <label className="admin-field">
            <span className="admin-field-label">Mật khẩu hiện tại</span>
            <input type={showPasswords ? "text" : "password"} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Mật khẩu mới (12–18 số)</span>
            <input type={showPasswords ? "text" : "password"} inputMode="numeric" pattern="[0-9]{12,18}" value={newPassword} onChange={(event) => setNewPassword(event.target.value.replace(/\D/g, "").slice(0, 18))} autoComplete="new-password" required />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Nhập lại mật khẩu mới</span>
            <input type={showPasswords ? "text" : "password"} inputMode="numeric" pattern="[0-9]{12,18}" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value.replace(/\D/g, "").slice(0, 18))} autoComplete="new-password" required />
          </label>
          <button className="admin-password-visibility" type="button" onClick={() => setShowPasswords((current) => !current)}>
            {showPasswords ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            <span>{showPasswords ? "Ẩn các dãy số" : "Hiện các dãy số"}</span>
          </button>
          <footer className="admin-password-modal-footer">
            <button className="admin-secondary-button" type="button" onClick={onClose} disabled={busy}>Hủy</button>
            <button className="admin-primary-button admin-icon-text-button" type="submit" disabled={busy}>
              <KeyRound aria-hidden="true" />
              <span>{busy ? "Đang đổi..." : "Đổi mật khẩu"}</span>
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
