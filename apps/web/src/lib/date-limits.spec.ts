import { describe, expect, it } from 'vitest';

import { addMonthsClampedIso, getExpenseDateMax } from './date-limits';

describe('expense date limits', () => {
  it('adds two calendar months and clamps month-end', () => {
    expect(addMonthsClampedIso('2026-01-31', 2)).toBe('2026-03-31');
    expect(addMonthsClampedIso('2026-12-31', 2)).toBe('2027-02-28');
  });

  it('returns the frontend maximum expense date', () => {
    expect(getExpenseDateMax(new Date(2026, 6, 27))).toBe('2026-09-27');
  });
});
