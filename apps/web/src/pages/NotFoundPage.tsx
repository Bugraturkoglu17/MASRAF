import { Link } from 'react-router-dom';

export function NotFoundPage(): JSX.Element {
  return (
    <StatusPage
      code="404"
      title="Sayfa bulunamadı"
      description="Aradığınız sayfa taşınmış veya hiç var olmamış olabilir."
    />
  );
}

export function StatusPage({
  code,
  title,
  description,
}: {
  code: string;
  title: string;
  description: string;
}): JSX.Element {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--space-6)',
        gap: 8,
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>
        {code}
      </span>
      <h1 style={{ fontSize: 22, margin: 0 }}>{title}</h1>
      <p style={{ color: 'var(--color-text-muted)', maxWidth: 360 }}>{description}</p>
      <Link to="/" style={{ marginTop: 16 }}>
        Ana sayfaya dön
      </Link>
    </div>
  );
}
