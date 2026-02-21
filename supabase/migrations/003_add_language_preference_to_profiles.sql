-- Add language preference column to profiles table (if profiles table exists)
-- This stores the user's preferred reply language for the Hinglish persona feature

ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS preferred_reply_language VARCHAR DEFAULT 'auto';

-- If profiles table does not exist, create it
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR,
  full_name VARCHAR,
  avatar_url VARCHAR,
  preferred_reply_language VARCHAR DEFAULT 'auto',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable row-level security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can read and update their own profile
CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
