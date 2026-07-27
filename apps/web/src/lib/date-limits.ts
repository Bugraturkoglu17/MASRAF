export function toLocalIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addMonthsClampedIso(iso: string, months: number): string {
  const [yearText = '0', monthText = '1', dayText = '1'] = iso.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const targetMonthStart = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(
    targetMonthStart.getFullYear(),
    targetMonthStart.getMonth() + 1,
    0,
  ).getDate();
  return toLocalIsoDate(
    new Date(targetMonthStart.getFullYear(), targetMonthStart.getMonth(), Math.min(day, lastDay)),
  );
}

export function getExpenseDateMax(today = new Date()): string {
  return addMonthsClampedIso(toLocalIsoDate(today), 2);
}
