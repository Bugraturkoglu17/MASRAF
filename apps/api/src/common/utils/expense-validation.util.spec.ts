import { addMonthsClampedIso, assertExpenseDates } from './expense-validation.util';

describe('expense date validation', () => {
  const now = new Date('2026-07-27T12:00:00.000Z');

  it('accepts old expense dates and a date exactly two months ahead', () => {
    expect(() => assertExpenseDates('2020-01-01', '2026-07-27', now)).not.toThrow();
    expect(() => assertExpenseDates('2026-09-27', undefined, now)).not.toThrow();
  });

  it('rejects expense dates more than two months ahead with the required message', () => {
    expect(() => assertExpenseDates('2026-09-28', undefined, now)).toThrow(
      'Masraf tarihi en fazla 2 ay sonrası olabilir.',
    );
  });

  it('rejects a past due date with the required message', () => {
    expect(() => assertExpenseDates('2026-07-27', '2026-07-26', now)).toThrow(
      'Vade tarihi geçmiş bir tarih olamaz.',
    );
  });

  it('clamps dates at month end', () => {
    expect(addMonthsClampedIso('2026-12-31', 2)).toBe('2027-02-28');
  });
});
