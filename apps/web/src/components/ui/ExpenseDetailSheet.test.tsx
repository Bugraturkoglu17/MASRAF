import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExpenseDetailSheet } from './ExpenseDetailSheet';

import { ToastProvider } from '@/components/feedback/toast-context';
import { apiFetch } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }));

describe('ExpenseDetailSheet', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it('belge adını gizleyip 6 haneli masraf kodunu gösterir', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      id: 'expense-1',
      expenseNumber: '10000042',
      expenseCode: '402945',
      title: 'Aİ KREDİ',
      amount: '860',
      currency: 'TRY',
      expenseDate: '2026-07-26T00:00:00.000Z',
      status: 'PENDING',
      createdAt: '2026-07-26T00:00:00.000Z',
      category: { name: 'Diğer' },
      attachments: [
        {
          id: 'attachment-1',
          fileName: 'uzun-ve-gereksiz-fatura-dosya-adi.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 2048,
          createdAt: '2026-07-26T00:00:00.000Z',
        },
      ],
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ExpenseDetailSheet expenseId="expense-1" onClose={vi.fn()} />
        </ToastProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findAllByText('Masraf #402945')).toHaveLength(2);
    expect(screen.getByText('Belge 1 · 2 KB')).toBeInTheDocument();
    expect(screen.queryByText('uzun-ve-gereksiz-fatura-dosya-adi.pdf')).not.toBeInTheDocument();
  });
});
