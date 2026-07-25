import { useQuery } from '@tanstack/react-query';

import { AdminPage } from './admin-ui';

import { apiFetch } from '@/lib/api-client';

interface SystemOverview {
  userLimit: number;
  usedUsers: number;
  remainingUsers: number;
  defaultCurrency: string;
  defaultLanguage: string;
}

export function AdminSystemOverviewPage(): JSX.Element {
  const { data, isLoading } = useQuery<SystemOverview>({
    queryKey: ['admin', 'system-overview'],
    queryFn: () => apiFetch('/users/system-overview'),
  });

  const currencyLabel = data?.defaultCurrency === 'TRY' ? 'TL (₺)' : (data?.defaultCurrency ?? '—');

  const cards = [
    { label: 'Kullanıcı Limiti', value: data?.userLimit },
    { label: 'Kullanılan Kullanıcı', value: data?.usedUsers },
    { label: 'Kalan Kullanıcı Hakkı', value: data?.remainingUsers },
  ];

  return (
    <AdminPage title="Sistem Ayarları" subtitle="Lisans ve sistem geneli bilgiler.">
      <div className="adm-stat-grid">
        {cards.map((card) => (
          <div key={card.label} className="adm-stat-card">
            <span className="adm-stat-value">{isLoading ? '…' : (card.value ?? '—')}</span>
            <span className="adm-stat-label">{card.label}</span>
          </div>
        ))}
      </div>

      <section className="adm-card" style={{ maxWidth: 560 }}>
        <h2 className="adm-section-title">Genel Bilgiler</h2>
        <div className="adm-detail-row">
          <span className="k">Varsayılan Para Birimi</span>
          <span className="v">{currencyLabel}</span>
        </div>
        <div className="adm-detail-row">
          <span className="k">Varsayılan Dil</span>
          <span className="v">{data?.defaultLanguage ?? '—'}</span>
        </div>
      </section>

      {data && data.remainingUsers === 0 && (
        <p style={{ fontSize: 13, color: '#f87171', marginTop: 16 }}>
          Kullanıcı limiti dolu. Yeni kullanıcı eklemek için limitin artırılması gerekir.
        </p>
      )}
    </AdminPage>
  );
}
