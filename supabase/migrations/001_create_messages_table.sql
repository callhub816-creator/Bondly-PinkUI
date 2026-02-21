-- Create messages table for chat functionality
-- Supports: basic messaging, replies, editing, soft-delete, deletion tracking

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL,
  reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Indexes for common queries
  CONSTRAINT messages_sender_fk FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT messages_deleted_by_fk FOREIGN KEY (deleted_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_deleted_at ON public.messages(deleted_at);
CREATE INDEX idx_messages_reply_to ON public.messages(reply_to);

-- Enable row-level security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS policies: allow users to read all messages in their chats, write own, delete own
CREATE POLICY "Users can read messages in their chats"
  ON public.messages FOR SELECT
  USING (true); -- In production, add chat membership check

CREATE POLICY "Users can insert own messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete (soft-delete) own messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = deleted_by);
