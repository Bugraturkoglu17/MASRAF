import { useAuth } from '@/features/auth/auth-context';

export function DashboardPage(): JSX.Element {
  const { user } = useAuth();
  return (
    <section>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>
        Hoş geldiniz{user ? `, ${user.firstName}` : ''}
      </h1>
      <p style={{ color: 'var(--color-text-muted)', maxWidth: 480 }}>
        Bu sürüm yalnızca uygulama altyapısını (kimlik doğrulama, yetkilendirme, gezinme) içerir.
        Masraf oluşturma, onay ve raporlama ekranları sonraki geliştirme aşamasında eklenecektir.
      </p>
    </section>
  );
}
