import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { TurkeyIbanInput } from './TurkeyIbanInput';

function TestInput(): JSX.Element {
  const [value, setValue] = useState('');
  return <TurkeyIbanInput aria-label="IBAN" value={value} onChange={setValue} />;
}

describe('TurkeyIbanInput', () => {
  it('TR önekini sabit tutar ve yalnızca 24 rakam kabul eder', () => {
    render(<TestInput />);
    const input = screen.getByRole('textbox', { name: 'IBAN' }) as HTMLInputElement;

    expect(input.value).toBe('TR');
    fireEvent.change(input, { target: { value: 'abcdef123456789012345678901234567890' } });

    expect(input.value).toBe('TR123456789012345678901234');
    expect(input).toHaveAttribute('maxlength', '26');
  });

  it('TR öneki geri tuşuyla silinemez', () => {
    render(<TestInput />);
    const input = screen.getByRole('textbox', { name: 'IBAN' }) as HTMLInputElement;
    input.setSelectionRange(2, 2);

    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(input.value).toBe('TR');
  });
});
