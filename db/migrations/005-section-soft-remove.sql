-- 005: soft-remove for page_sections (S5-8, Mira's pages wireframe spec:
-- "Remove frees the slot — removed sections appear in the registry and can
-- be re-added any time, content preserved"). DELETE no longer destroys the
-- row; it flips `removed`. Re-add flips it back — content override intact.
ALTER TABLE page_sections ADD COLUMN IF NOT EXISTS removed boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS page_sections_removed_idx ON page_sections (page_key, removed);
