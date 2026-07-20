import { calcDaysRemaining } from '@/lib/date-utils';

interface DueDateBadgeProps {
  dueDate?: string | null;
}

export function DueDateBadge({ dueDate }: DueDateBadgeProps): JSX.Element {
  if (!dueDate) {
    return (
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>
        Vade Yok
      </span>
    );
  }

  const days = calcDaysRemaining(dueDate);

  let label: string;
  let color: string;
  let bg: string;

  if (days > 7) {
    label = `${days} Gün`;
    color = 'var(--color-text-muted)';
    bg = 'transparent';
  } else if (days >= 3) {
    label = `${days} Gün`;
    color = '#b45309';
    bg = '#fffbeb';
  } else if (days >= 1) {
    label = `${days} Gün`;
    color = '#c2410c';
    bg = '#fff7ed';
  } else if (days === 0) {
    label = 'Bugün';
    color = '#dc2626';
    bg = '#fef2f2';
  } else {
    label = `${Math.abs(days)} Gün Gecikti`;
    color = '#991b1b';
    bg = '#fef2f2';
  }

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        color,
        background: bg,
        padding: bg !== 'transparent' ? '2px 7px' : '0',
        borderRadius: 10,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
