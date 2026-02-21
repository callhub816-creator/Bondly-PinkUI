-- Create call_history table for persisting voice call metadata

CREATE TABLE IF NOT EXISTS public.call_history (
  call_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL,
  callee_id UUID NOT NULL,
  start_ts TIMESTAMPTZ NOT NULL,
  end_ts TIMESTAMPTZ,
  duration_seconds INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT call_history_caller_fk FOREIGN KEY (caller_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT call_history_callee_fk FOREIGN KEY (callee_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_call_history_caller_id ON public.call_history(caller_id);
CREATE INDEX idx_call_history_callee_id ON public.call_history(callee_id);
CREATE INDEX idx_call_history_created_at ON public.call_history(created_at DESC);

-- Enable row-level security
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can read their own call history
CREATE POLICY "Users can read their own call history"
  ON public.call_history FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "System can insert call records"
  ON public.call_history FOR INSERT
  WITH CHECK (true); -- In production, restrict to authenticated users or system role
