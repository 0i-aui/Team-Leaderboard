/**
 * Low-level Web Push client helpers. No secrets here — only the public
 * VAPID key (meant to be public) and browser APIs.
 */

export interface StoredPush {
  personId: string;
  endpoint: string;
}

const STORE_KEY = 'tl-push-subscription';

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getVapidPublicKey(): string | undefined {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  return key && !key.includes('your-') ? key : undefined;
}

export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob(base64.replace(/-/g, '+').replace(/_/g, '/') + padding);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function getServiceWorker(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) {
    // Best-effort update check; failures must not break subscribing.
    try {
      void existing.update().catch(() => {});
    } catch {
      /* ignore */
    }
    return existing;
  }
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

export async function getBrowserSubscription(): Promise<PushSubscription | null> {
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export function readStoredPush(): StoredPush | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPush>;
    if (typeof parsed.personId === 'string' && typeof parsed.endpoint === 'string') {
      return { personId: parsed.personId, endpoint: parsed.endpoint };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeStoredPush(value: StoredPush | null): void {
  try {
    if (value) localStorage.setItem(STORE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORE_KEY);
  } catch {
    /* private mode — just won't persist */
  }
}

export function subscriptionKeys(sub: PushSubscription): { p256dh: string; auth: string } | null {
  try {
    const json = sub.toJSON();
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (typeof p256dh !== 'string' || typeof auth !== 'string') return null;
    return { p256dh, auth };
  } catch {
    return null;
  }
}
