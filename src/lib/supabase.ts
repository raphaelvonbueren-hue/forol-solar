/**
 * Supabase-Client für FOROL Solar Frontend.
 *
 * Verwendet den Publishable Key — sicher für Client-Side da RLS-Policies
 * den Zugriff steuern (anonyme User sehen nur veröffentlichte Daten,
 * können Inquiries inserten, aber nicht lesen).
 *
 * Falls die ENV-Variablen fehlen, wird der Client nicht initialisiert und
 * `isSupabaseConfigured` ist `false` — die App nutzt dann die hardcoded Demo.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase ist nicht konfiguriert. VITE_SUPABASE_URL und VITE_SUPABASE_KEY müssen gesetzt sein.',
      );
    }
    _client = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return _client;
}
