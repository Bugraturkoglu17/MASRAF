import { describe, expect, it } from 'vitest';

import {
  decimalToTurkishInput,
  formatTry,
  formatTurkishMoneyInput,
  toDecimalString,
} from './money';

describe('Turkish money helpers', () => {
  it('formats integer and decimal input without floating point conversion', () => {
    expect(formatTurkishMoneyInput('1250,50')).toBe('1.250,50');
    expect(toDecimalString('1.250,50')).toBe('1250.50');
    expect(toDecimalString('2.700')).toBe('2700.00');
  });

  it('renders API decimals in the requested TRY format', () => {
    expect(decimalToTurkishInput('1250.5')).toBe('1.250,50');
    expect(formatTry('999999999999.99')).toBe('₺999.999.999.999,99');
  });
});
