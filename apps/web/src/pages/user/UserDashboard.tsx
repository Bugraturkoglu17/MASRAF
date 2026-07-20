import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Clock, FileText, PlusCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/auth-context';
import { apiFetch } from '@/lib/api-client';

interface Counts {
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
}

const cards = [
  {
    key: 'draft',
    label: 'Taslak',
    icon: FileText,
    color: 'var(--color-draft)',
    bg: 'var(--color-draft-bg)',
    to: '/expenses?status=DRAFT',
  },
  {
    key: 'pending',
    label: 'Onayda Bekleyen',
    icon: Clock,
    color: 'var(--color-pending)',
    bg: 'var(--color-pending-bg)',
    to: '/expenses?status=PENDING',
  },
  {
    key: 'approved',
    label: 'Onaylanan',
    icon: CheckCircle,
    color: 'var(--color-approved)',
    bg: 'var(--color-approved-bg)',
    to: '/expenses?status=APPROVED',
  },
  {
    key: 'rejected',
    label: 'Reddedilen',
    icon: XCircle,
    color: 'var(--color-rejected)',
    bg: 'var(--color-rejected-bg)',
    to: '/expenses?status=REJECTED',
  },
] as const;

export function UserDashboard(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: counts } = useQuery<Counts>({
    queryKey: ['expense-counts'],
    queryFn: () => apiFetch('/expenses/counts'),
    refetchInterval: 10000,
  });

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Merhaba, {user?.firstName} 👋</h1>
          <p style={subStyle}>Masraflarınızı buradan yönetebilirsiniz.</p>
        </div>
        <button onClick={() => navigate('/expenses/new')} style={newBtnStyle}>
          <PlusCircle size={16} />
          Yeni Masraf
        </button>
      </div>

      <div style={gridStyle}>
        {cards.map(({ key, label, icon: Icon, color, bg, to }) => (
          <button key={key} onClick={() => navigate(to)} style={cardStyle}>
            <div style={cardIconStyle(bg)}>
              <Icon size={22} color={color} />
            </div>
            <div style={cardCountStyle(color)}>{counts ? counts[key] : '—'}</div>
            <div style={cardLabelStyle}>{label}</div>
          </button>
        ))}
      </div>

      <div style={quickActionsStyle}>
        <h2 style={sectionTitleStyle}>Hızlı İşlemler</h2>
        <div style={actionsGridStyle}>
          <button
            onClick={() => navigate('/expenses/new')}
            style={actionBtnStyle('#2563eb', '#eff6ff')}
          >
            <PlusCircle size={20} color="#2563eb" />
            <span>Masraf Oluştur</span>
          </button>
          <button
            onClick={() => navigate('/expenses?status=DRAFT')}
            style={actionBtnStyle('var(--color-draft)', 'var(--color-draft-bg)')}
          >
            <FileText size={20} color="var(--color-draft)" />
            <span>Taslaklarım</span>
          </button>
          <button
            onClick={() => navigate('/expenses?status=PENDING')}
            style={actionBtnStyle('var(--color-pending)', 'var(--color-pending-bg)')}
          >
            <Clock size={20} color="var(--color-pending)" />
            <span>Bekleyenler</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = { padding: '28px 32px', maxWidth: 900 };
const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  marginBottom: 28,
  flexWrap: 'wrap',
  gap: 16,
};
const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: 'var(--color-text)',
  margin: '0 0 4px',
};
const subStyle: React.CSSProperties = { fontSize: 14, color: 'var(--color-text-muted)', margin: 0 };
const newBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 18px',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  background: 'var(--color-primary)',
  color: '#fff',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
};
const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 16,
  marginBottom: 32,
};

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '20px 16px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  cursor: 'pointer',
  textAlign: 'center',
  boxShadow: 'var(--shadow-sm)',
  transition: 'transform 0.15s, box-shadow 0.15s',
};

const cardIconStyle = (bg: string): React.CSSProperties => ({
  width: 48,
  height: 48,
  borderRadius: 12,
  background: bg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const cardCountStyle = (color: string): React.CSSProperties => ({
  fontSize: 32,
  fontWeight: 800,
  color,
  lineHeight: 1,
});

const cardLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--color-text-muted)',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: 'var(--color-text)',
  marginBottom: 16,
  marginTop: 0,
};
const quickActionsStyle: React.CSSProperties = {};
const actionsGridStyle: React.CSSProperties = { display: 'flex', gap: 12, flexWrap: 'wrap' };

const actionBtnStyle = (color: string, bg: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 18px',
  borderRadius: 'var(--radius-sm)',
  border: `1px solid ${color}30`,
  background: bg,
  color: 'var(--color-text)',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
});
