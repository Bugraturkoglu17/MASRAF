import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { IbanCopyButton } from './IbanCopyButton';

describe('IbanCopyButton', () => {
  it('IBAN’ı boşluksuz kopyalar ve geri bildirim gösterir', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<IbanCopyButton value="TR12 3456 7890 1234 5678 9012 34" />);
    fireEvent.click(screen.getByRole('button', { name: 'IBAN’ı kopyala' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('TR123456789012345678901234'));
    expect(screen.getByText('Kopyalandı')).toBeInTheDocument();
  });
});
