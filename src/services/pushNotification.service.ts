// Web Push notification service — subscribe/unsubscribe/save to Supabase
import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export async function subscribeToPush(userId: string, orgId: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    if (!VAPID_PUBLIC_KEY) {
      console.warn('[Push] VITE_VAPID_PUBLIC_KEY not set');
      return false;
    }

    const permission = await requestPushPermission();
    if (permission !== 'granted') return false;

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const key = sub.getKey('p256dh');
    const auth = sub.getKey('auth');
    if (!key || !auth) return false;

    const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)));
    const authStr = btoa(String.fromCharCode(...new Uint8Array(auth)));

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        organization_id: orgId,
        endpoint: sub.endpoint,
        p256dh,
        auth: authStr,
        updated: new Date().toISOString(),
      },
      { onConflict: 'user_id,endpoint' },
    );

    if (error) {
      console.error('[Push] Save subscription failed:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Push] Subscribe error:', err);
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  } catch (err) {
    console.error('[Push] Unsubscribe error:', err);
  }
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getPushPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}
