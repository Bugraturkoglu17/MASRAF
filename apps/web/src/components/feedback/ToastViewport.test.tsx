import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider, useToast } from './toast-context';
import { ToastViewport } from './ToastViewport';

function ToastTriggers(): JSX.Element {
  const { showToast } = useToast();

  return (
    <>
      <button type="button" onClick={() => showToast('Onaya gönderildi.', 'success')}>
        Başarı
      </button>
      {[1, 2, 3, 4, 5].map((number) => (
        <button key={number} type="button" onClick={() => showToast(`Bildirim ${number}`, 'info')}>
          Bildirim {number}
        </button>
      ))}
    </>
  );
}

function renderToasts(): void {
  render(
    <ToastProvider>
      <ToastTriggers />
      <ToastViewport />
    </ToastProvider>,
  );
}

describe('ToastViewport', () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    act(() => vi.runOnlyPendingTimers());
    vi.useRealTimers();
  });

  it('bildirimi çıkış animasyonundan sonra kapatır', () => {
    renderToasts();
    fireEvent.click(screen.getByRole('button', { name: 'Başarı' }));

    const toast = screen.getByRole('status');
    expect(toast).toHaveTextContent('Onaya gönderildi.');
    expect(toast).toHaveClass('app-toast--visible', 'app-toast--success');

    fireEvent.click(screen.getByRole('button', { name: 'Bildirimi kapat' }));
    expect(toast).toHaveClass('app-toast--exiting');

    act(() => vi.advanceTimersByTime(240));
    expect(screen.queryByText('Onaya gönderildi.')).not.toBeInTheDocument();
  });

  it('bildirimleri düzenli bir şekilde en fazla dört öğe olarak istifler', () => {
    renderToasts();

    [1, 2, 3, 4, 5].forEach((number) => {
      fireEvent.click(screen.getByRole('button', { name: `Bildirim ${number}` }));
    });

    const viewport = screen.getByLabelText('Bildirimler');
    expect(within(viewport).queryByText('Bildirim 1')).not.toBeInTheDocument();
    expect(within(viewport).getAllByRole('status')).toHaveLength(4);
    expect(within(viewport).getByText('Bildirim 5')).toBeInTheDocument();
  });

  it('kısa gösterim süresinden sonra sağa çıkış durumuna geçer', () => {
    renderToasts();
    fireEvent.click(screen.getByRole('button', { name: 'Başarı' }));

    act(() => vi.advanceTimersByTime(2800));
    expect(screen.getByRole('status')).toHaveClass('app-toast--exiting');

    act(() => vi.advanceTimersByTime(240));
    expect(screen.queryByText('Onaya gönderildi.')).not.toBeInTheDocument();
  });
});
