type Status = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

const config: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  DRAFT: {
    label: 'Taslak',
    color: 'var(--color-draft)',
    bg: 'var(--color-draft-bg)',
    border: 'var(--color-draft-border)',
  },
  PENDING: {
    label: 'Onayda Bekleyen',
    color: 'var(--color-pending)',
    bg: 'var(--color-pending-bg)',
    border: 'var(--color-pending-border)',
  },
  APPROVED: {
    label: 'Onaylandı',
    color: 'var(--color-approved)',
    bg: 'var(--color-approved-bg)',
    border: 'var(--color-approved-border)',
  },
  REJECTED: {
    label: 'Reddedildi',
    color: 'var(--color-rejected)',
    bg: 'var(--color-rejected-bg)',
    border: 'var(--color-rejected-border)',
  },
  CANCELLED: {
    label: 'İptal Edildi',
    color: '#6b7280',
    bg: '#f3f4f6',
    border: '#d1d5db',
  },
};

export function StatusBadge({ status }: { status: Status }): JSX.Element {
  const c = config[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        color: c.color,
        background: c.bg,
        border: `1px solid ${c.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {c.label}
    </span>
  );
}
