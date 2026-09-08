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
        // 2. Service worker + push subscription (reuses the existing one
        // if this browser already subscribed — upsert moves it).
        const vapidKey = getVapidPublicKey();
        if (!vapidKey) {
          setStatus('no-key');
          return;
        }
        const reg = await getServiceWorker();
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
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
