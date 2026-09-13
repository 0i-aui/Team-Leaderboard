import { PostgrestClient } from '@supabase/postgrest-js';
import { RealtimeClient } from '@supabase/realtime-js';
import type { Database } from '../types/supabase-types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('your-project'));

if (!isSupabaseConfigured) {
  console.warn(
    '[Team Leaderboard] Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Showing demo data until configured.',
  );
}

const baseUrl = url ?? 'https://placeholder.supabase.co';
const key = anonKey ?? 'placeholder-anon-key';

// Lean client pairing: PostgREST for queries/RPC + Realtime for live
// updates. This intentionally bypasses the supabase-js umbrella package
// (which would also bundle auth/storage/functions clients this read-only,
// login-free app never uses) while keeping identical call-site APIs and
// the same auth wiring supabase-js itself uses (anon apikey param).
const rest = new PostgrestClient<Database>(`${baseUrl}/rest/v1`, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
  },
  schema: 'public',
});

const realtime = new RealtimeClient(`${baseUrl}/realtime/v1`, {
  params: { apikey: key, eventsPerSecond: 10 },
});

/** Drop-in subset of the supabase-js surface this app actually uses. */
export const supabase = {
  from: rest.from.bind(rest),
  rpc: rest.rpc.bind(rest),
  channel: realtime.channel.bind(realtime),
  removeChannel: realtime.removeChannel.bind(realtime),
};
