ALTER TABLE users
  ADD COLUMN session_version BIGINT UNSIGNED NOT NULL DEFAULT 1 AFTER role;

ALTER TABLE users
  ADD COLUMN email_otp_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER session_version;

ALTER TABLE users
  ADD COLUMN last_login_at TIMESTAMP NULL AFTER updated_at;

ALTER TABLE users
  ADD COLUMN last_login_ip_hash CHAR(64) NULL AFTER last_login_at;
