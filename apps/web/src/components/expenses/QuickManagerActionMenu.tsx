import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
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
      >
        <ActionButton
          icon={<Clock3 />}
          label="Bekleyenler"
          color="#d97706"
          onClick={() => go('/manager/pending')}
        />
        <ActionButton
          icon={<CheckCircle2 />}
          label="Onaylananlar"
          color="#16a34a"
          onClick={() => go('/manager/approved')}
        />
        <ActionButton
          icon={<XCircle />}
          label="Reddedilenler"
          color="#dc2626"
          onClick={() => go('/manager/rejected')}
        />
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="quick-expense-option" onClick={onClick}>
      <span style={{ background: color, boxShadow: `0 13px 30px ${color}66` }}>{icon}</span>
      <strong>{label}</strong>
    </button>
  );
}
