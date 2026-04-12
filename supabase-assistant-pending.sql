-- Questions sans réponse de l'assistant — BNA Crédit
-- Run in Supabase SQL Editor
-- If you already ran the previous version, run the DROP first then recreate.

DROP TABLE IF EXISTS public.assistant_pending;

CREATE TABLE public.assistant_pending (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question    TEXT NOT NULL,
  nb_fois     INT  NOT NULL DEFAULT 1,
  repondu     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_pending_repondu
  ON public.assistant_pending (repondu, nb_fois DESC);

ALTER TABLE public.assistant_pending ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.assistant_pending
  USING (true)
  WITH CHECK (true);
