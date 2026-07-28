import 'server-only';

import { createClient } from '@supabase/supabase-js';

function getRequiredEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function createSupabaseAdminClient() {
  return createClient(
    getRequiredEnvironmentValue('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnvironmentValue('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}

export function createSupabaseServerAuthClient() {
  return createClient(
    getRequiredEnvironmentValue('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnvironmentValue('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}
