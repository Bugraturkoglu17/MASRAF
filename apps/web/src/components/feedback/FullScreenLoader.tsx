export function FullScreenLoader({ label = 'Yükleniyor...' }: { label?: string }): JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        color: 'var(--color-text-muted)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-primary)',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <span>{label}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
