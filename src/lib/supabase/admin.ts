import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin Client
 *
 * Uses the service role key to bypass Row Level Security (RLS).
 * Only use this on the server side for trusted operations.
 * Never expose this client or the service role key to the browser.
 */
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
