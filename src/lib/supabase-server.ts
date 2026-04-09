import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

/**
 * Server-only client. Prefer SUPABASE_SERVICE_ROLE_KEY so API routes bypass RLS
 * (this app uses custom cookie auth, not Supabase Auth — anon RLS cannot map user_id).
 */
export const supabaseServer = createClient(
  url!,
  (serviceKey || anonKey)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export function hasServiceRole(): boolean {
  return Boolean(serviceKey);
}
