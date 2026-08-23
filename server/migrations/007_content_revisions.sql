CREATE TABLE IF NOT EXISTS site_content_revisions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  site_key VARCHAR(64) NOT NULL,
  version BIGINT UNSIGNED NOT NULL,
  content JSON NOT NULL,
  published_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT content_revision_user_fk FOREIGN KEY (published_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY content_revision_version_unique (site_key, version),
  INDEX content_revision_created_idx (site_key, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO site_content_revisions (site_key, version, content, published_by, created_at)
SELECT site_key, version, content, updated_by, updated_at FROM site_content;
