const TURKEY_IBAN_DIGIT_COUNT = 24;

export function normalizeTurkeyIban(value: string): string {
  const upper = value.toUpperCase();
  const withoutCountryCode = upper.startsWith('TR') ? upper.slice(2) : upper;
  const digits = withoutCountryCode.replace(/\D/g, '').slice(0, TURKEY_IBAN_DIGIT_COUNT);
  return `TR${digits}`;
}
