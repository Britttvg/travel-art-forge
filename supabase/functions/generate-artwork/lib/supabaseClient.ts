// Supabase client setup for generate-artwork function
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function getSupabaseClient(req: Request) {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  );
}
