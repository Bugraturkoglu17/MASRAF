import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  BanknoteIcon,
  Bell,
  CheckCircle,
  Clock,
  RefreshCw,
  Search,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ManagerExpenseCard, type ManagerExpense } from '@/components/expenses/ExpenseCards';
import { useToast } from '@/components/feedback/toast-context';
import { PanelBrandMark } from '@/components/PanelBrandMark';
import { ExpenseDetailSheet } from '@/components/ui/ExpenseDetailSheet';
import { useAuth } from '@/features/auth/auth-context';
import { ApiError, apiFetch, getApiErrorMessage } from '@/lib/api-client';
import { formatTry } from '@/lib/money';

interface ManagerCounts {
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  monthlyTotal: string;
  payableTotal: string;
}

interface PagedResult {
  items: ManagerExpense[];
  meta: { totalItems: number; page: number; totalPages: number };
}

interface NotificationSummary {
  readAt: string | null;
}

type Decision = { kind: 'approve' | 'reject' | 'cancel'; expense: ManagerExpense };
type SortOption =
  | 'due-nearest'
  | 'due-farthest'
  | 'most-overdue'
  | 'newest'
  | 'oldest'
  | 'amount-high'
  | 'amount-low';

const SORT_LABELS: Record<SortOption, string> = {
  'due-nearest': 'Vadeye en yakın',
  'due-farthest': 'Vadeye en uzak',
  'most-overdue': 'En çok gecikmiş',
  newest: 'En yeni',
  oldest: 'En eski',
  'amount-high': 'En yüksek tutar',
  'amount-low': 'En düşük tutar',
};

function todayLabel() {
  return new Date().toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function ManagerDashboard(): JSX.Element {
  const { user } = useAuth();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sort, setSort] = useState<SortOption>('due-nearest');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);

  const { data: notifications = [] } = useQuery<NotificationSummary[]>({
    queryKey: ['notifications'],
    queryFn: () => apiFetch('/notifications'),
    refetchInterval: 30_000,
  });
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications],
  );

  const activeDetailId = detailId ?? params.get('expense');

  const apiSort = sort === 'amount-high' || sort === 'amount-low' ? ('newest' as const) : sort;

  const { data: counts, refetch: refetchCounts } = useQuery<ManagerCounts>({
    queryKey: ['manager-counts'],
    queryFn: () => apiFetch('/expenses/manager/counts'),
    refetchInterval: 30_000,
  });

  const {
    data: pendingData,
    isLoading,
    dataUpdatedAt,
    refetch: refetchPending,
  } = useQuery<PagedResult>({
    queryKey: ['manager-pending', apiSort],
    queryFn: () => apiFetch(`/expenses/manager/pending?limit=100&sort=${apiSort}`),
    refetchInterval: 15_000,
  });

  const categories = useMemo(() => {
    const cats = new Set(pendingData?.items?.map((e) => e.category.name) ?? []);
    return [...cats].sort();
  }, [pendingData]);

  const filtered = useMemo(() => {
    let items = pendingData?.items ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (e) =>
          `${e.user.firstName} ${e.user.lastName}`.toLowerCase().includes(q) ||
          (e.expenseCode ?? '').toLowerCase().includes(q) ||
          e.title.toLowerCase().includes(q) ||
          (e.description ?? '').toLowerCase().includes(q),
      );
    }
    if (categoryFilter) {
      items = items.filter((e) => e.category.name === categoryFilter);
    }
    if (sort === 'amount-high') {
      return [...items].sort((a, b) => Number(b.amount) - Number(a.amount));
    }
    if (sort === 'amount-low') {
      return [...items].sort((a, b) => Number(a.amount) - Number(b.amount));
    }
    return items;
  }, [pendingData, search, categoryFilter, sort]);

  const lastSyncTime = useMemo(
    () =>
      lastRefreshAt || dataUpdatedAt
        ? new Date(lastRefreshAt ?? dataUpdatedAt).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : null,
    [dataUpdatedAt, lastRefreshAt],
  );

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const [countResult, pendingResult] = await Promise.all([
        refetchCounts(),
        refetchPending(),
        qc.refetchQueries({ queryKey: ['notifications'], type: 'active' }),
      ]);
      if (countResult.error || pendingResult.error) throw countResult.error ?? pendingResult.error;
      setLastRefreshAt(Date.now());
      showToast('Yönetici verileri yenilendi.', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Veriler yenilenemedi. Lütfen tekrar deneyin.'), 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const finish = (expenseId: string, message: string) => {
    qc.setQueryData<PagedResult>(['manager-pending', apiSort], (old) =>
      old
        ? {
            ...old,
            items: old.items.filter((i) => i.id !== expenseId),
            meta: { ...old.meta, totalItems: Math.max(0, old.meta.totalItems - 1) },
          }
        : old,
    );
    void qc.invalidateQueries({ queryKey: ['manager-counts'] });
    void qc.invalidateQueries({ queryKey: ['expenses'] });
    setDecision(null);
    setReason('');
    setDetailId(null);
    showToast(message, 'success');
  };

  const decide = useMutation({
    mutationFn: async (val: Decision) => {
      if (val.kind === 'approve')
        return apiFetch(`/expenses/${val.expense.id}/approve`, { method: 'POST' });
      return apiFetch(`/expenses/${val.expense.id}/${val.kind}`, {
        method: 'POST',
        body: { reason },
      });
    },
    onSuccess: (_, val) =>
      finish(
        val.expense.id,
        val.kind === 'approve'
          ? 'Masraf onaylandı.'
          : val.kind === 'reject'
            ? 'Masraf reddedildi.'
            : 'Masraf iptal edildi.',
      ),
    onError: (error) =>
      showToast(
        'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
        'error',
        error instanceof ApiError && error.requestId ? `Talep: ${error.requestId}` : undefined,
      ),
  });

  return (
    <div className="manager-dashboard">
      {/* ── Header ── */}
      <div className="manager-dashboard-header">
        <div className="manager-dashboard-heading">
          <PanelBrandMark />
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--color-text)',
                margin: '0 0 4px',
              }}
            >
              Merhaba, {user?.firstName}
            </h1>
            <p
              style={{
                fontSize: 13,
                color: 'var(--color-text-muted)',
                margin: 0,
                textTransform: 'capitalize',
              }}
            >
              {todayLabel()}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button
            type="button"
            className="header-notification-button"
            aria-label={unreadCount ? `Bildirimler, ${unreadCount} okunmamış` : 'Bildirimler'}
            onClick={() => navigate('/manager/notifications')}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notification-icon-badge">{Math.min(unreadCount, 99)}</span>
            )}
          </button>
          {lastSyncTime && (
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Son güncelleme: {lastSyncTime}
            </span>
          )}
          <button
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: 13,
              fontWeight: 500,
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              opacity: isRefreshing ? 0.65 : 1,
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin' : undefined} />
            {isRefreshing ? 'Yenileniyor…' : 'Yenile'}
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="manager-stat-grid">
        <StatCard
          label="Onayda Bekleyen"
          sublabel="Karar bekleyen masraflar"
          icon={Clock}
          value={counts?.pending ?? 0}
          color="var(--color-pending)"
          bg="var(--color-pending-bg)"
          border="var(--color-pending-border)"
          onClick={() => navigate('/manager/pending')}
        />
        <StatCard
          label="Onaylanan"
          sublabel="Onaylanmış masraflar"
          icon={CheckCircle}
          value={counts?.approved ?? 0}
          color="var(--color-approved)"
          bg="var(--color-approved-bg)"
          border="var(--color-approved-border)"
          onClick={() => navigate('/manager/approved')}
        />
        <StatCard
          label="Reddedilen"
          sublabel="Red kararı verilen"
          icon={XCircle}
          value={counts?.rejected ?? 0}
          color="var(--color-rejected)"
          bg="var(--color-rejected-bg)"
          border="var(--color-rejected-border)"
          onClick={() => navigate('/manager/rejected')}
        />
        <StatCard
          label="İptal Edilen"
          sublabel="Kullanıcı tarafından iptal"
          icon={AlertCircle}
          value={counts?.cancelled ?? 0}
          color="var(--color-cancelled)"
          bg="var(--color-cancelled-bg)"
          border="var(--color-cancelled-border)"
        />
        <StatCard
          label="Bu Ay Toplam"
          sublabel="Bu ayki masraf tutarı"
          icon={TrendingUp}
          value={counts?.monthlyTotal ?? 0}
          formatter={formatTry}
          color="var(--color-info)"
          bg="var(--color-info-bg)"
          border="var(--color-info-border)"
        />
        <StatCard
          label="Onaylanan Toplam"
          sublabel="Tüm onaylı masraf tutarı"
          icon={BanknoteIcon}
          value={counts?.payableTotal ?? 0}
          formatter={formatTry}
          color="var(--color-primary)"
          bg="rgba(114,87,232,0.08)"
          border="rgba(114,87,232,0.25)"
        />
      </div>

      {/* ── Pending list header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
          Bekleyen Masraflar
          {(counts?.pending ?? 0) > 0 && (
            <span
              style={{
                marginLeft: 8,
                padding: '2px 8px',
                borderRadius: 10,
                background: 'var(--color-pending-bg)',
                color: 'var(--color-pending)',
                fontSize: 12,
                fontWeight: 700,
                border: '1px solid var(--color-pending-border)',
              }}
            >
              {counts!.pending}
            </span>
          )}
        </h2>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="manager-filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            className="manager-search-input"
            type="search"
            placeholder="Ad, masraf no veya açıklama ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 34,
              paddingRight: 12,
              height: 38,
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        {categories.length > 1 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="manager-sort-select"
          >
            <option value="">Tüm kategoriler</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="manager-sort-select"
        >
          {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      {/* ── Expense List ── */}
      {isLoading ? (
        <div className="expense-list-loading">Masraflar yükleniyor…</div>
      ) : filtered.length === 0 ? (
        <div className="expense-empty-state">
          <span>
            <Clock />
          </span>
          <strong>
            {search || categoryFilter ? 'Arama sonucu bulunamadı.' : 'Bekleyen masraf bulunmuyor.'}
          </strong>
          <p>
            {search || categoryFilter
              ? 'Filtre kriterlerini değiştirerek tekrar deneyin.'
              : 'Yeni gönderimler anlık olarak burada görünecek.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((expense) => (
            <ManagerExpenseCard
              key={expense.id}
              expense={expense}
              selected={detailId === expense.id}
              onSelect={() => setDetailId(expense.id)}
              onApprove={() => setDecision({ kind: 'approve', expense })}
              onReject={() => setDecision({ kind: 'reject', expense })}
              onCancel={() => setDecision({ kind: 'cancel', expense })}
              busy={decide.isPending}
            />
          ))}
        </div>
      )}

      {activeDetailId && (
        <ExpenseDetailSheet
          expenseId={activeDetailId}
          onClose={() => {
            setDetailId(null);
            if (params.has('expense')) {
              const next = new URLSearchParams(params);
              next.delete('expense');
              setParams(next, { replace: true });
            }
          }}
        />
      )}

      {decision && (
        <DecisionModal
          decision={decision}
          reason={reason}
          onReason={setReason}
          busy={decide.isPending}
          onClose={() => {
            setDecision(null);
            setReason('');
          }}
          onConfirm={() => decide.mutate(decision)}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  sublabel,
  icon: Icon,
  value,
  formatter,
  color,
  bg,
  border,
  onClick,
}: {
  label: string;
  sublabel: string;
  icon: React.ElementType;
  value: number | string;
  formatter?: (n: number | string) => string;
  color: string;
  bg: string;
  border: string;
  onClick?: () => void;
}) {
  const display = formatter ? formatter(value) : String(value);
  const isAmount = Boolean(formatter);

  const Tag = onClick ? 'button' : ('div' as const);
  return (
    <Tag
      className="manager-stat-card"
      onClick={onClick}
      style={{
        position: 'relative',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '18px 16px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: 'var(--shadow-sm)',
        textAlign: 'left',
        width: '100%',
        overflow: 'hidden',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
    >
      {/* Accent top bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: color,
          borderRadius: '10px 10px 0 0',
        }}
      />
      {/* Icon */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: bg,
          border: `1px solid ${border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={17} color={color} />
      </div>
      {/* Value + labels */}
      <div>
        <div
          style={{
            fontSize: isAmount ? 17 : 28,
            fontWeight: 800,
            color,
            lineHeight: 1.1,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
            overflowWrap: 'anywhere',
          }}
        >
          {display}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginTop: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
          {sublabel}
        </div>
      </div>
    </Tag>
  );
}

function DecisionModal({
  decision,
  reason,
  onReason,
  onClose,
  onConfirm,
  busy,
}: {
  decision: Decision;
  reason: string;
  onReason: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const requiresReason = decision.kind !== 'approve';
  const verb =
    decision.kind === 'approve' ? 'Onayla' : decision.kind === 'reject' ? 'Reddet' : 'İptal et';
  return (
    <div className="decision-backdrop" onMouseDown={onClose}>
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="decision-title"
        className="decision-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className={`decision-symbol ${decision.kind}`} />
        <h2 id="decision-title">Masrafı {verb.toLocaleLowerCase('tr-TR')}</h2>
        <p>
          <strong>
            {decision.expense.user.firstName} {decision.expense.user.lastName}
          </strong>{' '}
          tarafından gönderilen &ldquo;{decision.expense.title}&rdquo; masrafı için bu işlem
          uygulanacak.
        </p>
        {requiresReason && (
          <label>
            Gerekçe <span>*</span>
            <textarea
              autoFocus
              value={reason}
              onChange={(e) => onReason(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Karar gerekçesini açıklayın…"
            />
          </label>
        )}
        <div>
          <button type="button" onClick={onClose}>
            Vazgeç
          </button>
          <button
            type="button"
            className={decision.kind}
            disabled={busy || (requiresReason && !reason.trim())}
            onClick={onConfirm}
          >
            {busy ? 'İşleniyor…' : verb}
          </button>
        </div>
      </section>
    </div>
  );
}
