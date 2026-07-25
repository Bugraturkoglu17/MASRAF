import { forwardRef, type InputHTMLAttributes, type KeyboardEvent } from 'react';

import { normalizeTurkeyIban } from './turkey-iban';

interface TurkeyIbanInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'maxLength'
> {
  value?: string | null;
  onChange: (value: string) => void;
}

export const TurkeyIbanInput = forwardRef<HTMLInputElement, TurkeyIbanInputProps>(
  function TurkeyIbanInput({ value, onChange, onFocus, onClick, onKeyDown, ...props }, ref) {
    const keepCaretAfterPrefix = (input: HTMLInputElement) => {
      if ((input.selectionStart ?? 2) < 2) input.setSelectionRange(2, 2);
    };

    const protectPrefix = (event: KeyboardEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const selectionStart = input.selectionStart ?? 2;
      const selectionEnd = input.selectionEnd ?? selectionStart;
      const touchesPrefix =
        selectionStart < 2 || (event.key === 'Backspace' && selectionStart <= 2);
      if ((event.key === 'Backspace' || event.key === 'Delete') && touchesPrefix) {
        event.preventDefault();
        input.setSelectionRange(Math.max(2, selectionEnd), Math.max(2, selectionEnd));
      }
      onKeyDown?.(event);
    };

    return (
      <input
        {...props}
        ref={ref}
        value={normalizeTurkeyIban(value ?? '')}
        maxLength={26}
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(normalizeTurkeyIban(event.target.value))}
        onKeyDown={protectPrefix}
        onFocus={(event) => {
          keepCaretAfterPrefix(event.currentTarget);
          onFocus?.(event);
        }}
        onClick={(event) => {
          keepCaretAfterPrefix(event.currentTarget);
          onClick?.(event);
        }}
      />
    );
  },
);
