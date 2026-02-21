-- 004_add_soft_delete_columns.sql
-- Add soft-delete support for messages (soft_delete_expires_at and deleted_by)

ALTER TABLE IF EXISTS messages
  ADD COLUMN IF NOT EXISTS soft_delete_expires_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid NULL;

-- Optional index to help queries
CREATE INDEX IF NOT EXISTS idx_messages_soft_delete_expires_at ON messages(soft_delete_expires_at);
