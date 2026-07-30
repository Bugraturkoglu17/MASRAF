import { CheckCircle2, Clock3, ReceiptText, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function QuickManagerActionMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): JSX.Element | null {
  const navigate = useNavigate();
  if (!open) return null;

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div
      className="mobile-action-backdrop quick-expense-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className="quick-expense-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Masraf listesi seçenekleri"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ padding: '16px 12px 12px' }}
      >
        <p
          style={{
            margin: '0 0 12px',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            textAlign: 'center',
          }}
        >
          Hızlı Erişim
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <ActionCard
            icon={<Clock3 size={22} />}
            label="Bekleyenler"
            desc="Onay bekleyen talepler"
            color="#d97706"
            bg="rgba(217,119,6,0.1)"
            onClick={() => go('/manager/pending')}
          />
          <ActionCard
            icon={<CheckCircle2 size={22} />}
            label="Onaylananlar"
            desc="Onaylanan masraflar"
            color="#16a34a"
            bg="rgba(22,163,74,0.1)"
            onClick={() => go('/manager/approved')}
          />
          <ActionCard
            icon={<XCircle size={22} />}
            label="Reddedilenler"
            desc="Reddedilen masraflar"
            color="#dc2626"
            bg="rgba(220,38,38,0.1)"
            onClick={() => go('/manager/rejected')}
          />
          <ActionCard
            icon={<ReceiptText size={22} />}
            label="Masraflarım"
            desc="Kişisel masraf girişi"
            color="#7c3aed"
            bg="rgba(124,58,237,0.1)"
            onClick={() => go('/manager/my-expenses')}
          />
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  label,
  desc,
  color,
  bg,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  color: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 8,
        padding: '14px 12px',
        borderRadius: 14,
        border: `1px solid ${color}30`,
        background: bg,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'transform 0.1s, box-shadow 0.1s',
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
      onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: 10,
          background: color,
          color: '#fff',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <strong
          style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}
        >
          {label}
        </strong>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
          {desc}
        </span>
      </span>
    </button>
  );
}
