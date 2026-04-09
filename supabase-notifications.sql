-- Notifications (run in Supabase SQL Editor)
-- Next.js API must use SUPABASE_SERVICE_ROLE_KEY in .env (server only) to read/write.

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  rdv_id uuid REFERENCES public.rendez_vous(id) ON DELETE SET NULL,
  lue boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- No policies for anon: only the service role (used in API routes) bypasses RLS.
-- Add SUPABASE_SERVICE_ROLE_KEY to .env (Settings → API → service_role, never expose to client).
