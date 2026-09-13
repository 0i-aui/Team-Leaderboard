import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  getBrowserSubscription,
  getServiceWorker,
  getVapidPublicKey,
  isPushSupported,
  readStoredPush,
  subscriptionKeys,
  urlBase64ToUint8Array,
  writeStoredPush,
} from '../lib/push';

export type PushStatus =
  | 'unsupported'
  | 'no-key'
  | 'denied'
  | 'idle'
  | 'busy'
  | 'active'
  | 'error';

// Minimum gap between registration attempts from this browser. This is
// abuse friction only (DevTools can bypass it) — the real enforcement
// is the per-person subscription cap in register_push_subscription.
const ATTEMPT_COOLDOWN_MS = 15 * 1000;
const ATTEMPT_KEY = 'tl-push-attempt';

function attemptAllowed(): boolean {
  try {
    const last = Number(localStorage.getItem(ATTEMPT_KEY) ?? 0);
    if (Date.now() - last < ATTEMPT_COOLDOWN_MS) return false;
    localStorage.setItem(ATTEMPT_KEY, String(Date.now()));
    return true;
  } catch {
    return true;
  }
}

/**
 * Push subscription state machine. Permission is only ever requested
 * inside the explicit enable() click handler — never on load.
 */
export function usePush() {
  const [status, setStatus] = useState<PushStatus>('idle');
  const [selectedId, setSelectedId] = useState('');
  const [activePersonId, setActivePersonId] = useState<string | null>(null);

  const supported = isPushSupported();
  const configured = getVapidPublicKey() !== undefined;

  // Reconcile browser state on mount: an existing subscription (e.g. from
  // another session) counts as active for its stored person.
  useEffect(() => {
    if (!supported || !configured) {
      setStatus(!supported ? 'unsupported' : 'no-key');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    let cancelled = false;
    void (async () => {
      const [sub, stored] = await Promise.all([
        getBrowserSubscription(),
        Promise.resolve(readStoredPush()),
      ]);
      if (cancelled) return;
      if (sub && stored && sub.endpoint === stored.endpoint) {
        setSelectedId(stored.personId);
        setActivePersonId(stored.personId);
        setStatus('active');
      } else if (stored) {
        setSelectedId(stored.personId);
        setStatus('idle');
      } else {
        setStatus('idle');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported, configured]);

  const enable = useCallback(
    async (personId: string) => {
      if (!supported || !configured || !personId) return;
      if (!attemptAllowed()) return;
      setStatus('busy');
      try {
        // 1. Permission — must run in this click gesture.
        if (Notification.permission === 'denied') {
          setStatus('denied');
          return;
        }
        if (Notification.permission === 'default') {
          const result = await Notification.requestPermission();
          if (result !== 'granted') {
            setStatus(result === 'denied' ? 'denied' : 'idle');
            return;
          }
        }
        // 2. Service worker + push subscription. Reuse the browser's
        // existing subscription when possible; a stale subscription
        // (e.g. rotated VAPID key) makes subscribe() throw, in which
        // case we drop it and subscribe fresh.
        const vapidKey = getVapidPublicKey();
        if (!vapidKey) {
          setStatus('no-key');
          return;
        }
        const reg = await getServiceWorker();
        let sub = await getBrowserSubscription();
        if (!sub) {
          try {
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidKey),
            });
          } catch (e) {
            const name = e instanceof Error ? e.name : '';
            if (name !== 'InvalidStateError' && name !== 'NotAllowedError') throw e;
            const stale = await getBrowserSubscription();
            if (stale) {
              try {
                await stale.unsubscribe();
              } catch {
                /* already dead — subscribe fresh below */
              }
            }
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidKey),
            });
          }
        }
        const keys = subscriptionKeys(sub);
        if (!keys) throw new Error('unreadable-keys');
        // 3. Store server-side, keyed to the selected member.
        const { error } = await supabase.rpc('register_push_subscription', {
          p_person_id: personId,
          p_endpoint: sub.endpoint,
          p_p256dh: keys.p256dh,
          p_auth: keys.auth,
        });
        if (error) throw error;
        writeStoredPush({ personId, endpoint: sub.endpoint });
        setActivePersonId(personId);
        setStatus('active');
      } catch {
        setStatus('error');
      }
    },
    [supported, configured],
  );

  const disable = useCallback(async () => {
    if (!supported) return;
    setStatus('busy');
    try {
      const stored = readStoredPush();
      const sub = await getBrowserSubscription();
      // Best-effort browser unsubscribe; server deactivation happens regardless.
      if (sub) {
        try {
          await sub.unsubscribe();
        } catch {
          /* endpoint may already be dead — server cleanup covers it */
        }
      }
      if (stored) {
        const { error } = await supabase.rpc('unregister_push_subscription', {
          p_person_id: stored.personId,
          p_endpoint: stored.endpoint,
        });
        if (error) throw error;
      }
      writeStoredPush(null);
      setActivePersonId(null);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }, [supported]);

  return { status, supported, selectedId, setSelectedId, activePersonId, enable, disable };
}
