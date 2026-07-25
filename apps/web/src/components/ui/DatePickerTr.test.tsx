import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DatePickerTr } from './DatePickerTr';

describe('DatePickerTr', () => {
  it('takvim düğmesiyle modern seçiciyi açar ve eski tarih girdisini kullanmaz', () => {
    const { container } = render(
      <DatePickerTr value="2026-07-26" onChange={vi.fn()} />,
    );

    expect(container.querySelector('input[type="date"]')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Takvimden tarih seç' }));

    expect(screen.getByRole('dialog', { name: 'Tarih seçici' })).toBeInTheDocument();
    expect(screen.getByText('Temmuz 2026')).toBeInTheDocument();
  });

  it('aylar arasında gezinir ve seçilen günü ISO biçiminde bildirir', () => {
    const onChange = vi.fn();
    render(<DatePickerTr value="2026-07-26" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Takvimden tarih seç' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki ay' }));
    expect(screen.getByText('Ağustos 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '15 Ağustos 2026' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-08-15');
    expect(screen.queryByRole('dialog', { name: 'Tarih seçici' })).not.toBeInTheDocument();
  });

  it('elle girilen Türkçe tarihi doğrular', () => {
    const onChange = vi.fn();
    render(<DatePickerTr id="test-date" value="" onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText('GG.AA.YYYY'), {
      target: { value: '31072026' },
    });

    expect(screen.getByDisplayValue('31.07.2026')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith('2026-07-31');
  });
});
