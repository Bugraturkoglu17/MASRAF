import { useAuth } from '@/features/auth/auth-context';

export function ProfilePlaceholderPage(): JSX.Element {
  const { user } = useAuth();
  return (
    <section>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>Profilim</h1>
      <dl style={{ color: 'var(--color-text)', fontSize: 14 }}>
        <dt style={{ color: 'var(--color-text-muted)' }}>E-posta</dt>
        <dd style={{ margin: '0 0 12px' }}>{user?.email}</dd>
        <dt style={{ color: 'var(--color-text-muted)' }}>Ad Soyad</dt>
        <dd style={{ margin: 0 }}>
          {user?.firstName} {user?.lastName}
        </dd>
      </dl>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 16, maxWidth: 480 }}>
        Profil düzenleme ekranı sonraki aşamada eklenecektir.
      </p>
    </section>
  );
}
