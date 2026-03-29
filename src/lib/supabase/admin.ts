import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client — uses the service role key to bypass RLS.
 * Only use in server-side API routes, never in client code.
 */
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // fallback to anon for local dev

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
