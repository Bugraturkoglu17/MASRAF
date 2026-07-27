import { ConflictAppException } from '../exceptions/app.exception';

function todayIso(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function addMonthsClampedIso(iso: string, months: number): string {
  const [yearText = '0', monthText = '1', dayText = '1'] = iso.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, lastDay)),
  )
    .toISOString()
    .slice(0, 10);
}

export function assertExpenseDates(
  expenseDate?: string,
  dueDate?: string,
  now = new Date(),
): void {
  const today = todayIso(now);
  if (expenseDate && expenseDate > addMonthsClampedIso(today, 2)) {
    throw new ConflictAppException('Masraf tarihi en fazla 2 ay sonrası olabilir.');
  }
  if (dueDate && dueDate < today) {
    throw new ConflictAppException('Vade tarihi geçmiş bir tarih olamaz.');
  }
}
