-- 005_add_profiles_language.sql
-- Add preferred_reply_language to profiles table

ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS preferred_reply_language VARCHAR DEFAULT 'auto';

-- Allowed values: 'auto', 'hinglish', 'english' (enforced in application layer)

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_language ON profiles(preferred_reply_language);
