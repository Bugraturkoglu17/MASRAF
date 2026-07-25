import type { ReactNode } from 'react';

/** Admin sayfaları için ortak kabuk: başlık + içerik + ortak CSS. */
export function AdminPage({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="adm-page">
      <div className="adm-header">
        <div>
          <h1 className="adm-title">{title}</h1>
          {subtitle && <p className="adm-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="adm-actions">{actions}</div>}
      </div>
      {children}
      <style>{ADMIN_CSS}</style>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }): JSX.Element {
  const active = status === 'ACTIVE';
  return (
    <span className={`adm-badge ${active ? 'adm-badge-green' : 'adm-badge-red'}`}>
      {active ? 'Aktif' : 'Pasif'}
    </span>
  );
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Yönetici',
  USER: 'Kullanıcı',
};
const ROLE_CLASSES: Record<string, string> = {
  ADMIN: 'adm-badge-purple',
  MANAGER: 'adm-badge-amber',
  USER: 'adm-badge-blue',
};

export function RoleBadge({ role }: { role: string }): JSX.Element {
  return (
    <span className={`adm-badge ${ROLE_CLASSES[role] ?? 'adm-badge-gray'}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

export function BoolBadge({
  value,
  yes,
  no,
  invert,
}: {
  value: boolean;
  yes: string;
  no: string;
  /** true ise value=true kırmızı gösterilir (ör. geçici şifre kullanıyor) */
  invert?: boolean;
}): JSX.Element {
  const good = invert ? !value : value;
  return (
    <span className={`adm-badge ${good ? 'adm-badge-green' : 'adm-badge-red'}`}>
      {value ? yes : no}
    </span>
  );
}

const ADMIN_CSS = `
.adm-page { padding: 20px 16px 40px; max-width: 1200px; margin: 0 auto; }
@media (min-width: 768px) { .adm-page { padding: 28px 32px 48px; } }
.adm-header {
  display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between;
  gap: 12px; margin-bottom: 24px;
}
.adm-title { font-size: 22px; font-weight: 700; color: var(--color-text); margin: 0 0 4px; }
.adm-subtitle { font-size: 14px; color: var(--color-text-muted); margin: 0; }
.adm-badge {
  display: inline-block; padding: 3px 10px; border-radius: 999px;
  font-size: 12px; font-weight: 600; white-space: nowrap;
}
.adm-badge-green { background: rgba(22,163,74,0.15); color: #4ade80; }
.adm-badge-red { background: rgba(220,38,38,0.15); color: #f87171; }
.adm-badge-blue { background: rgba(37,99,235,0.15); color: #60a5fa; }
.adm-badge-amber { background: rgba(217,119,6,0.15); color: #fbbf24; }
.adm-badge-purple { background: rgba(124,58,237,0.18); color: #c4b5fd; }
.adm-badge-gray { background: rgba(148,163,184,0.15); color: #94a3b8; }

.adm-card {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-lg); padding: 16px;
}
.adm-stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 28px; }
@media (min-width: 768px) { .adm-stat-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; } }
.adm-stat-card {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-lg); padding: 14px 16px; display: flex; flex-direction: column; gap: 4px;
}
.adm-stat-value { font-size: 26px; font-weight: 700; color: var(--color-text); line-height: 1.1; }
.adm-stat-label { font-size: 12px; font-weight: 500; color: var(--color-text-muted); }

.adm-section-title { font-size: 15px; font-weight: 700; color: var(--color-text); margin: 0 0 12px; }

.adm-table-wrap { display: none; }
.adm-cards { display: flex; flex-direction: column; gap: 10px; }
@media (min-width: 900px) {
  .adm-table-wrap {
    display: block; overflow-x: auto; background: var(--color-surface);
    border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  }
  .adm-cards { display: none; }
}
.adm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.adm-table th {
  text-align: left; padding: 12px 14px; font-size: 11px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border); white-space: nowrap;
}
.adm-table td {
  padding: 11px 14px; color: var(--color-text); border-bottom: 1px solid var(--color-border);
  vertical-align: middle; white-space: nowrap;
}
.adm-table tbody tr:last-child td { border-bottom: none; }
.adm-table tbody tr:hover { background: rgba(148,163,184,0.05); }

.adm-user-card {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-lg); padding: 14px; display: flex; flex-direction: column; gap: 8px;
}
.adm-user-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.adm-user-card-name { font-size: 15px; font-weight: 700; color: var(--color-text); }
.adm-user-card-row { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; }
.adm-user-card-row .k { color: var(--color-text-muted); }
.adm-user-card-row .v { color: var(--color-text); text-align: right; }

.adm-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 9px 14px; border-radius: 8px; border: 1px solid transparent;
  font-size: 13px; font-weight: 600; cursor: pointer; min-height: 38px; text-decoration: none;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, transform 160ms ease;
}
.adm-btn-primary { background: var(--color-primary); color: #fff; }
.adm-btn-outline { background: transparent; color: var(--color-text); border-color: var(--color-border); }
.adm-btn-danger { background: rgba(220,38,38,0.12); color: #f87171; }
.adm-btn-primary:hover:not(:disabled) { background: var(--color-primary-hover); transform: translateY(-1px); }
.adm-btn-outline:hover:not(:disabled) { background: var(--color-surface-raised); border-color: var(--color-primary); }
.adm-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.adm-btn-sm { padding: 6px 10px; font-size: 12px; min-height: 30px; }

.adm-input, .adm-select {
  width: 100%; padding: 10px 12px; border-radius: 8px; border: 1.5px solid var(--color-border);
  background: var(--color-bg); color: var(--color-text); font-size: 14px; outline: none; box-sizing: border-box;
}
.adm-input:focus, .adm-select:focus { border-color: var(--color-primary); box-shadow: 0 0 0 4px var(--focus-ring); }
.adm-label { display: block; font-size: 13px; font-weight: 600; color: var(--color-text); margin-bottom: 6px; }
.adm-field { margin-bottom: 14px; }
.adm-error { color: var(--color-danger); font-size: 12px; margin-top: 4px; }
.adm-filters { display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 16px; }
@media (min-width: 768px) { .adm-filters { grid-template-columns: 2fr 1fr 1fr 1fr; align-items: end; } }
.adm-empty { padding: 32px 16px; text-align: center; color: var(--color-text-muted); font-size: 14px; }
.adm-pager {
  display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px;
  font-size: 13px; color: var(--color-text-muted);
}

.adm-modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 1000;
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.adm-modal {
  background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  padding: 20px; width: 100%; max-width: 440px; max-height: 90dvh; overflow-y: auto;
}
.adm-modal-title { font-size: 16px; font-weight: 700; color: var(--color-text); margin: 0 0 14px; }
.adm-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }

.adm-detail-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
@media (min-width: 900px) { .adm-detail-grid { grid-template-columns: 1fr 1fr; } }
.adm-detail-row {
  display: flex; justify-content: space-between; gap: 12px; padding: 9px 0;
  border-bottom: 1px solid var(--color-border); font-size: 13px;
}
.adm-detail-row:last-child { border-bottom: none; }
.adm-detail-row .k { color: var(--color-text-muted); flex-shrink: 0; }
.adm-detail-row .v { color: var(--color-text); text-align: right; word-break: break-word; }
`;
