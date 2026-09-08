/**
 * POST /api/notify-points — sends a "Weekly Points Updated" push to the
 * subscriptions of exactly one person.
 *
 * Trigger: Supabase Database Webhook on points_history INSERT.
 * No frontend code can reach this: VAPID private key, service-role key
 * and webhook secret live only in Vercel environment variables.
 *
 * Idempotency: one row per history event in push_log (unique history_id).
 * A repeated webhook for the same event is acknowledged without resending.
 */

import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import type { Database } from '../src/types/supabase-types';

type Req = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
};

type Res = {
  status: (code: number) => Res;
  json: (body: unknown) => void;
};

interface WebhookRecord {
  id?: unknown;
  person_id?: unknown;
  points_change?: unknown;
}

interface WebhookBody {
  type?: unknown;
  schema?: unknown;
  table?: unknown;
  record?: WebhookRecord | null;
}

function header(req: Req, name: string): string | undefined {
  const v = req.headers[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export default async function handler(req: Req, res: Res): Promise<void> {
  if ((req.method ?? 'GET').toUpperCase() !== 'POST') {
    res.status(200).json({ ok: true, service: 'notify-points', usage: 'POST only' });
    return;
  }

  // 1. Authenticate the webhook caller.
  const secret = env('PUSH_WEBHOOK_SECRET');
  if (!secret || header(req, 'x-push-secret') !== secret) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }

  // 2. Validate the event shape — only real history inserts proceed.
  const body = (req.body ?? {}) as WebhookBody;
  if (body.type !== 'INSERT' || body.schema !== 'public' || body.table !== 'points_history') {
    res.status(200).json({ ok: true, skipped: 'not-a-history-insert' });
    return;
  }
  const record = body.record ?? {};
  const historyId = typeof record.id === 'string' ? record.id : null;
  const personId = typeof record.person_id === 'string' ? record.person_id : null;
  const pointsChange = typeof record.points_change === 'number' ? record.points_change : null;
  if (!historyId || !personId || pointsChange == null) {
    res.status(200).json({ ok: true, skipped: 'malformed-record' });
    return;
  }
  // Weekly updates are additions; deductions stay silent.
  if (pointsChange <= 0) {
    res.status(200).json({ ok: true, skipped: 'non-positive-change' });
    return;
  }

  const supabaseUrl = env('SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const vapidPublic = env('VAPID_PUBLIC_KEY');
  const vapidPrivate = env('VAPID_PRIVATE_KEY');
  if (!supabaseUrl || !serviceKey || !vapidPublic || !vapidPrivate) {
    res.status(500).json({ ok: false, error: 'server-not-configured' });
    return;
  }

  const supabase = createClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 3. Idempotency gate: exactly one send attempt per history event.
  const { data: claimed, error: claimError } = await supabase
    .from('push_log')
    .insert({ history_id: historyId, person_id: personId })
    .select('history_id')
    .single();
  if (claimError || !claimed) {
    // Unique violation (or any failure here) → already handled / unsafe to send.
    res.status(200).json({ ok: true, skipped: 'duplicate-or-claim-failed' });
    return;
  }

  // 4. Load active subscriptions for THIS person only.
  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('person_id', personId)
    .eq('is_active', true);
  if (subsError) {
    res.status(200).json({ ok: true, skipped: 'subscriptions-unreadable' });
    return;
  }
  if (!subs || subs.length === 0) {
    res.status(200).json({ ok: true, skipped: 'no-subscribers', history_id: historyId });
    return;
  }

  // 5. Fresh total for the message body (this person's data only).
  let total: number | null = null;
  const { data: person } = await supabase
    .from('people')
    .select('points_a, points_b')
    .eq('id', personId)
    .single();
  if (person) total = person.points_a + person.points_b;

  const host = header(req, 'x-forwarded-host') ?? header(req, 'host') ?? '';
  try {
    webpush.setVapidDetails(host ? `https://${host}` : 'mailto:team-leaderboard@localhost', vapidPublic, vapidPrivate);
  } catch {
    res.status(500).json({ ok: false, error: 'vapid-misconfigured' });
    return;
  }

  const payload = JSON.stringify({
    title: 'Weekly Points Updated',
    body:
      total == null
        ? 'Your weekly points have been added. Check the leaderboard to see your updated score.'
        : `Your weekly points have been added. Your total is now ${total} points.`,
    url: '/',
    tag: `points-${historyId}`,
  });

  // 6. Fan out; deactivate dead endpoints instead of retrying them forever.
  let sent = 0;
  const deactivated: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (err: unknown) {
        const code =
          typeof err === 'object' && err !== null && 'statusCode' in err
            ? (err as { statusCode?: unknown }).statusCode
            : undefined;
        if (code === 404 || code === 410) {
          deactivated.push(s.id);
        }
      }
    }),
  );
  if (deactivated.length > 0) {
    await supabase.from('push_subscriptions').update({ is_active: false }).in('id', deactivated);
  }

  res.status(200).json({ ok: true, history_id: historyId, sent, deactivated: deactivated.length });
}
