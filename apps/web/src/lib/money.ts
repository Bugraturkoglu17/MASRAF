const MAX_INTEGER_DIGITS = 12;

export function formatTurkishMoneyInput(raw: string): string {
  const compact = raw.replace(/\./g, '').replace(/[^\d,]/g, '');
  const commaIndex = compact.indexOf(',');
  const hasComma = commaIndex >= 0;
  const integerRaw = (hasComma ? compact.slice(0, commaIndex) : compact)
    .replace(/^0+(?=\d)/, '')
    .slice(0, MAX_INTEGER_DIGITS);
  const integer = integerRaw || '0';
  const fraction = hasComma ? compact.slice(commaIndex + 1).replace(/\D/g, '').slice(0, 2) : '';
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return hasComma ? `${grouped},${fraction}` : grouped;
}

export function toDecimalString(value: string): string | null {
  const normalized = formatTurkishMoneyInput(value);
  const [integerDisplay = '', fraction = ''] = normalized.split(',');
  const integer = integerDisplay.replace(/\./g, '');
  if (!/^\d{1,12}$/.test(integer)) return null;
  if (/^0+$/.test(integer) && !/[1-9]/.test(fraction)) return null;
  return `${integer}.${fraction.padEnd(2, '0')}`;
}

export function decimalToTurkishInput(value: string | number): string {
  const raw = String(value).replace('.', ',');
  const formatted = formatTurkishMoneyInput(raw);
  const [integer, fraction = ''] = formatted.split(',');
  return `${integer},${fraction.padEnd(2, '0').slice(0, 2)}`;
}

export function formatTry(value: string | number): string {
  return `₺${decimalToTurkishInput(value)}`;
}
