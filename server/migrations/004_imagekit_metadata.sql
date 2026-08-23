ALTER TABLE media_assets
  ADD COLUMN storage_provider VARCHAR(32) NOT NULL DEFAULT 'tidb' AFTER storage_path;

ALTER TABLE media_assets
  ADD COLUMN provider_file_id VARCHAR(255) NULL AFTER storage_provider;

ALTER TABLE media_assets
  ADD UNIQUE KEY media_provider_file_unique (storage_provider, provider_file_id);
