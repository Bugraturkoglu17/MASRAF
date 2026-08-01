import { Bell, BellOff, X } from 'lucide-react';
import { useCallback, useState } from 'react';

import { usePushNotifications } from '@/hooks/usePushNotifications';

const DISMISSED_KEY = 'masraf:push-banner-dismissed';

export function PushPermissionBanner(): JSX.Element | null {
  const { permission, isSubscribing, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && !!sessionStorage.getItem(DISMISSED_KEY),
  );

  const visible =
    !dismissed && permission === 'default' && 'Notification' in window && 'PushManager' in window;

  const handleAllow = useCallback(async () => {
    const ok = await requestPermission();
    if (ok) setDismissed(true);
  }, [requestPermission]);

  const handleDismiss = useCallback(() => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  }, []);

  if (!visible || permission === 'unsupported' || permission === 'denied') return null;

  return (
    <div
      role="banner"
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(420px, calc(100vw - 32px))',
        background: 'var(--color-surface, #1e293b)',
        border: '1px solid var(--color-border, #334155)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        padding: '16px 18px',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        zIndex: 9999,
        animation: 'slideUp 0.3s ease',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {/* İkon */}
      <div
        style={{
          flexShrink: 0,
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'rgba(117,103,212,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Bell size={20} color="var(--color-accent, #7567d4)" />
      </div>

      {/* İçerik */}
      <div style={{ flex: 1 }}>
        <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 14, lineHeight: 1.4 }}>
          Anlık bildirimler
        </p>
        <p
          style={{
            margin: '0 0 12px',
            fontSize: 13,
            color: 'var(--color-text-muted, #94a3b8)',
            lineHeight: 1.5,
          }}
        >
          Masraf onaylandığında veya reddedildiğinde anında haberdar olun — uygulama kapalı olsa
          bile.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            disabled={isSubscribing}
            onClick={() => void handleAllow()}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--color-accent, #7567d4)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: isSubscribing ? 'wait' : 'pointer',
              opacity: isSubscribing ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Bell size={14} />
            {isSubscribing ? 'Ayarlanıyor…' : 'İzin Ver'}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--color-border, #334155)',
              background: 'transparent',
              color: 'var(--color-text-muted, #94a3b8)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <BellOff size={14} />
            Şimdi değil
          </button>
        </div>
      </div>

      {/* Kapat */}
      <button
        type="button"
        aria-label="Kapat"
        onClick={handleDismiss}
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-muted, #94a3b8)',
          padding: 4,
          marginTop: -2,
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
