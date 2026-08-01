import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api-client';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) buffer[i] = rawData.charCodeAt(i);
  return buffer.buffer as ArrayBuffer;
}

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await apiFetch<{ publicKey: string | null }>('/notifications/vapid-key');
    return res.publicKey;
  } catch {
    return null;
  }
}

async function registerPushSubscription(publicKey: string): Promise<boolean> {
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    // Zaten abone, sunucuya yeniden kaydet (idempotent)
    await sendSubscriptionToServer(existing);
    return true;
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await sendSubscriptionToServer(subscription);
  return true;
}

async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON();
  if (!json.keys?.p256dh || !json.keys?.auth) return;
  await apiFetch('/notifications/push-subscriptions', {
    method: 'POST',
    body: {
      endpoint: subscription.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    },
  });
}

export async function unregisterPushSubscription(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await apiFetch('/notifications/push-subscriptions', {
    method: 'DELETE',
    body: { endpoint: subscription.endpoint },
  });
  await subscription.unsubscribe();
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>(() => {
    if (!('Notification' in window) || !('PushManager' in window)) return 'unsupported';
    return Notification.permission as PermissionState;
  });
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Sayfa açıldığında zaten izin varsa otomatik yeniden abone ol
  useEffect(() => {
    if (permission !== 'granted') return;
    void (async () => {
      const publicKey = await getVapidPublicKey();
      if (!publicKey) return;
      try {
        await registerPushSubscription(publicKey);
      } catch {
        // Sessizce geç
      }
    })();
  }, [permission]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (permission === 'unsupported') return false;
    setIsSubscribing(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result !== 'granted') return false;

      const publicKey = await getVapidPublicKey();
      if (!publicKey) return false;
      return await registerPushSubscription(publicKey);
    } catch {
      return false;
    } finally {
      setIsSubscribing(false);
    }
  }, [permission]);

  return { permission, isSubscribing, requestPermission };
}
