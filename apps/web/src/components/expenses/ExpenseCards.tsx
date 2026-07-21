import {
  CheckCircle2,
  Clock3,
  Eye,
  FileImage,
  Mail,
  ReceiptText,
  RotateCcw,
  Send,
  Trash2,
  UserRound,
  XCircle,
} from 'lucide-react';

import { DueDateBadge } from '@/components/ui/DueDateBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';

export type ExpenseStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export interface ExpenseAttachmentSummary {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}
export interface ExpenseListItem {
  id: string;
  expenseNumber?: string | null;
  title: string;
  description?: string | null;
  amount: string;
  currency?: string;
  expenseDate: string;
  dueDate?: string | null;
  status: ExpenseStatus;
  category: { name: string };
  attachments?: ExpenseAttachmentSummary[];
}

const money = (amount: string | number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(amount));
const date = (value: string) => new Date(value).toLocaleDateString('tr-TR');

export function MobileReceiptExpenseCard({
  expense,
  onDetail,
  onSubmit,
  onEdit,
  onDelete,
  busy,
}: {
  expense: ExpenseListItem;
  onDetail?: () => void;
  onSubmit?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  busy?: boolean;
}) {
  const first = expense.attachments?.[0];
  return (
    <article className="receipt-expense-card" onClick={onDetail}>
      <div className="receipt-thumbnail" aria-hidden="true">
        {first?.mimeType.startsWith('image/') ? <FileImage /> : <ReceiptText />}
      </div>
      <div className="receipt-body">
        <time>{date(expense.expenseDate)}</time>
        <strong>{expense.category.name}</strong>
        <span title={expense.title}>{expense.title}</span>
        <StatusBadge status={expense.status} />
      </div>
      <div className="receipt-separator" aria-hidden="true" />
      <div className="receipt-aside">
        <strong>{money(expense.amount)}</strong>
        {expense.dueDate && <DueDateBadge dueDate={expense.dueDate} />}
      </div>
      {(onSubmit || onEdit || onDelete || onDetail) && (
        <div className="receipt-actions" onClick={(e) => e.stopPropagation()}>
          {onSubmit && (
            <button type="button" disabled={busy} onClick={onSubmit}>
              <Send /> Onaya gönder
            </button>
          )}
          {onEdit && (
            <button type="button" onClick={onEdit}>
              <RotateCcw /> Düzenle
            </button>
          )}
          {onDelete && (
            <button type="button" disabled={busy} onClick={onDelete}>
              <Trash2 /> Sil
            </button>
          )}
          {onDetail && (
            <button type="button" onClick={onDetail}>
              <Eye /> Detay
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export function ExpenseEmptyState({ status }: { status: ExpenseStatus }) {
  const content: Record<ExpenseStatus, [string, string]> = {
    DRAFT: [
      'Henüz taslak masrafınız yok.',
      'Ortadaki + düğmesiyle hızlıca yeni bir masraf oluşturabilirsiniz.',
    ],
    PENDING: ['Onay bekleyen masrafınız bulunmuyor.', 'Gönderdiğiniz masraflar burada görünür.'],
    APPROVED: [
      'Onaylanan masrafınız bulunmuyor.',
      'Yönetici tarafından onaylanan masraflar burada görünür.',
    ],
    REJECTED: [
      'Reddedilen masrafınız bulunmuyor.',
      'Red gerekçesini masraf detayından inceleyebilirsiniz.',
    ],
    CANCELLED: ['İptal edilen masrafınız bulunmuyor.', 'İptal edilen kayıtlar burada görünür.'],
  };
  const Icon =
    status === 'APPROVED'
      ? CheckCircle2
      : status === 'REJECTED'
        ? XCircle
        : status === 'PENDING'
          ? Clock3
          : ReceiptText;
  return (
    <div className="expense-empty-state">
      <span>
        <Icon />
      </span>
      <strong>{content[status][0]}</strong>
      <p>{content[status][1]}</p>
    </div>
  );
}

export function UserApprovalTabs({
  active,
  counts,
  onChange,
}: {
  active: 'PENDING' | 'APPROVED' | 'REJECTED';
  counts?: Partial<Record<'PENDING' | 'APPROVED' | 'REJECTED', number>>;
  onChange: (status: 'PENDING' | 'APPROVED' | 'REJECTED') => void;
}) {
  const labels = { PENDING: 'Bekleyen', APPROVED: 'Onaylanan', REJECTED: 'Reddedilen' } as const;
  return (
    <div className="approval-tabs" role="tablist">
      {(Object.keys(labels) as Array<keyof typeof labels>).map((status) => (
        <button
          type="button"
          role="tab"
          aria-selected={active === status}
          className={active === status ? 'active' : ''}
          key={status}
          onClick={() => onChange(status)}
        >
          {labels[status]}
          {typeof counts?.[status] === 'number' && <small>{counts[status]}</small>}
        </button>
      ))}
    </div>
  );
}

export function UserPendingExpenseList(props: ExpenseListProps) {
  return <ExpenseList {...props} status="PENDING" />;
}
export function UserApprovedExpenseList(props: ExpenseListProps) {
  return <ExpenseList {...props} status="APPROVED" />;
}
export function UserRejectedExpenseList(props: ExpenseListProps) {
  return <ExpenseList {...props} status="REJECTED" />;
}
interface ExpenseListProps {
  items: ExpenseListItem[];
  onDetail: (id: string) => void;
}
function ExpenseList({ items, status, onDetail }: ExpenseListProps & { status: ExpenseStatus }) {
  if (!items.length) return <ExpenseEmptyState status={status} />;
  return (
    <div className="receipt-list">
      {items.map((item) => (
        <MobileReceiptExpenseCard key={item.id} expense={item} onDetail={() => onDetail(item.id)} />
      ))}
    </div>
  );
}

export interface ManagerExpense extends ExpenseListItem {
  user: { id: string; firstName: string; lastName: string; email: string };
}
export function ExpenseSenderInfo({ sender }: { sender: ManagerExpense['user'] }) {
  return (
    <div className="expense-sender">
      <span>
        <UserRound />
      </span>
      <div>
        <strong>
          {sender.firstName} {sender.lastName}
        </strong>
        <small>
          <Mail /> {sender.email}
        </small>
      </div>
    </div>
  );
}
export function ManagerExpenseCard({
  expense,
  selected,
  onSelect,
  onApprove,
  onReject,
  onCancel,
  busy,
}: {
  expense: ManagerExpense;
  selected?: boolean;
  onSelect: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  busy?: boolean;
}) {
  return (
    <article className={`manager-expense-card ${selected ? 'selected' : ''}`}>
      <button type="button" className="manager-expense-main" onClick={onSelect}>
        <ExpenseSenderInfo sender={expense.user} />
        <div className="manager-expense-summary">
          <span>
            {expense.category.name} · {date(expense.expenseDate)}
          </span>
          <strong>{money(expense.amount)}</strong>
        </div>
        <div className="manager-expense-meta">
          <StatusBadge status={expense.status} />
          {expense.dueDate && <DueDateBadge dueDate={expense.dueDate} />}
        </div>
      </button>
      {(onApprove || onReject || onCancel) && (
        <div className="manager-card-actions">
          {onApprove && (
            <button type="button" disabled={busy} onClick={onApprove} className="approve">
              <CheckCircle2 /> Onayla
            </button>
          )}
          {onReject && (
            <button type="button" disabled={busy} onClick={onReject} className="reject">
              <XCircle /> Reddet
            </button>
          )}
          {onCancel && (
            <button type="button" disabled={busy} onClick={onCancel}>
              İptal
            </button>
          )}
        </div>
      )}
    </article>
  );
}
