import { Edit2, Eye, Send, Trash2 } from 'lucide-react';

import { DueDateBadge } from './DueDateBadge';
import { StatusBadge } from './StatusBadge';

type Status = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
type DueUrgency = 'overdue' | 'today' | 'soon' | 'upcoming';

interface Expense {
  id: string;
  expenseNumber?: string | null;
  title: string;
  amount: string | number;
  currency?: string;
  expenseDate: string;
  dueDate?: string | null;
  dueDaysRemaining?: number | null;
  dueUrgency?: DueUrgency | null;
  status: Status;
  category: { name: string };
}

interface ExpenseCardProps {
  expense: Expense;
  onSubmit?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDetail?: (id: string) => void;
  isSubmitting?: boolean;
  isDeleting?: boolean;
}

const statusBorderColors: Record<Status, string> = {
  DRAFT: 'var(--color-draft)',
  PENDING: 'var(--color-pending)',
  APPROVED: 'var(--color-approved)',
  REJECTED: 'var(--color-rejected)',
  CANCELLED: '#6b7280',
};

const fmt = (n: string | number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(n));

export function ExpenseCard({
  expense,
  onSubmit,
  onEdit,
  onDelete,
  onDetail,
  isSubmitting,
  isDeleting,
}: ExpenseCardProps): JSX.Element {
  const isDraft = expense.status === 'DRAFT';
  const borderColor = statusBorderColors[expense.status];

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 'var(--radius-md)',
        padding: '14px 14px 12px',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 0,
      }}
    >
      {/* Top row: number + amount */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 4,
        }}
      >
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500 }}>
          #{expense.expenseNumber ?? '—'}
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>
          {fmt(expense.amount)}
        </div>
      </div>

      {/* Title + category */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--color-text)',
          marginBottom: 2,
          lineHeight: 1.3,
        }}
      >
        {expense.title}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
        {expense.category.name}
      </div>

      {/* Date + due date row */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          {new Date(expense.expenseDate).toLocaleDateString('tr-TR')}
        </span>
        <DueDateBadge
          dueDate={expense.dueDate}
          dueDaysRemaining={expense.dueDaysRemaining}
          dueUrgency={expense.dueUrgency}
          showMissing
        />
      </div>

      {/* Bottom row: status + actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <StatusBadge status={expense.status} />
        <div style={{ display: 'flex', gap: 6 }}>
          {isDraft && onSubmit && (
            <ActionBtn
              icon={<Send size={13} />}
              label="Onaya Gönder"
              color="var(--color-approved)"
              bg="var(--color-approved-bg)"
              border="var(--color-approved-border)"
              onClick={() => onSubmit(expense.id)}
              disabled={isSubmitting}
            />
          )}
          {isDraft && onEdit && (
            <ActionBtn
              icon={<Edit2 size={13} />}
              label="Düzenle"
              color="var(--color-primary)"
              bg="#eff6ff"
              border="#bfdbfe"
              onClick={() => onEdit(expense.id)}
            />
          )}
          {isDraft && onDelete && (
            <ActionBtn
              icon={<Trash2 size={13} />}
              label="Sil"
              color="var(--color-danger)"
              bg="var(--color-danger-bg)"
              border="var(--color-danger-border)"
              onClick={() => onDelete(expense.id)}
              disabled={isDeleting}
            />
          )}
          {!isDraft && onDetail && (
            <ActionBtn
              icon={<Eye size={13} />}
              label="Detay"
              color="var(--color-text-muted)"
              bg="var(--color-bg)"
              border="var(--color-border)"
              onClick={() => onDetail(expense.id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  color,
  bg,
  border,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  bg: string;
  border: string;
  onClick: () => void;
  disabled?: boolean;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 10px',
        borderRadius: 6,
        border: `1px solid ${border}`,
        background: bg,
        color: disabled ? 'var(--color-text-muted)' : color,
        fontSize: 12,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      <span style={{ display: 'none' }}>{label}</span>
    </button>
  );
}
