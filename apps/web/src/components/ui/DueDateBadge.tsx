import { calcDaysRemaining } from '@/lib/date-utils';

type DueUrgency = 'overdue' | 'today' | 'soon' | 'upcoming';

interface DueDateBadgeProps {
  dueDate?: string | null;
  dueDaysRemaining?: number | null;
  dueUrgency?: DueUrgency | null;
  showMissing?: boolean;
}

const URGENCY_STYLE: Record<DueUrgency, { color: string; bg: string }> = {
  overdue: { color: '#991b1b', bg: '#fef2f2' },
  today: { color: '#dc2626', bg: '#fef2f2' },
  soon: { color: '#c2410c', bg: '#fff7ed' },
  upcoming: { color: '#b45309', bg: '#fffbeb' },
};

export function DueDateBadge({
  dueDate,
  dueDaysRemaining: precomputedDays,
  dueUrgency: precomputedUrgency,
  showMissing = false,
}: DueDateBadgeProps): JSX.Element | null {
  const hasDue = Boolean(dueDate || precomputedDays != null);

  if (!hasDue) {
    if (!showMissing) return null;
    return (
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>
        Vade belirtilmedi
      </span>
    );
  }

  const days = precomputedDays ?? (dueDate ? calcDaysRemaining(dueDate) : 0);
  const urgency: DueUrgency =
    precomputedUrgency ??
    (days < 0 ? 'overdue' : days === 0 ? 'today' : days <= 3 ? 'soon' : 'upcoming');

  let label: string;
  if (urgency === 'today') label = 'Bugün';
  else if (urgency === 'overdue') label = `${Math.abs(days)} Gün Geçti`;
  else label = `${days} Gün Kaldı`;

  const { color, bg } = URGENCY_STYLE[urgency];

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        color,
        background: bg,
        padding: '2px 7px',
        borderRadius: 10,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
