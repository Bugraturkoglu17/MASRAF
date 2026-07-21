import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ExpenseEmptyState,
  ManagerExpenseCard,
  MobileReceiptExpenseCard,
  UserApprovalTabs,
  type ManagerExpense,
} from './ExpenseCards';

const expense: ManagerExpense = {
  id: 'expense-1',
  expenseNumber: '1042',
  title: 'Müşteri toplantısı öğle yemeği',
  description: 'Şirket adına ödeme',
  amount: '390',
  expenseDate: '2026-07-03T00:00:00.000Z',
  status: 'PENDING',
  category: { name: 'Yurtiçi seyahat yemek' },
  attachments: [{ id: 'att-1', fileName: 'fis.jpg', mimeType: 'image/jpeg', sizeBytes: 1024 }],
  user: { id: 'user-1', firstName: 'Buğra', lastName: 'Türkoğlu', email: 'bugra@example.com' },
};

describe('AŞAMA 13 masraf bileşenleri', () => {
  it('mobil fiş kartında temel alanları ve tek durum terminolojisini gösterir', () => {
    render(<MobileReceiptExpenseCard expense={{ ...expense, status: 'APPROVED' }} />);
    expect(screen.getByText('Yurtiçi seyahat yemek')).toBeInTheDocument();
    expect(screen.getByText('₺390,00')).toBeInTheDocument();
    expect(screen.getByText('Onaylandı')).toBeInTheDocument();
    expect(screen.queryByText('Tamamlandı')).not.toBeInTheDocument();
  });

  it('bekleyen boş durum metnini doğru gösterir', () => {
    render(<ExpenseEmptyState status="PENDING" />);
    expect(screen.getByText('Onay bekleyen masrafınız bulunmuyor.')).toBeInTheDocument();
  });

  it('onay sekmesini sayfa yenilemeden callback ile değiştirir', () => {
    const onChange = vi.fn();
    render(
      <UserApprovalTabs
        active="PENDING"
        counts={{ PENDING: 2, APPROVED: 4, REJECTED: 1 }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /Onaylanan/ }));
    expect(onChange).toHaveBeenCalledWith('APPROVED');
  });

  it('yönetici kartında gönderen adı ve e-postayı listeler', () => {
    render(
      <ManagerExpenseCard
        expense={expense}
        onSelect={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Buğra Türkoğlu')).toBeInTheDocument();
    expect(screen.getByText('bugra@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Onayla/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reddet/ })).toBeInTheDocument();
  });
});
