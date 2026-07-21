export function calcDaysRemaining(dueDate: string): number {
  // Parse as local date parts to avoid UTC vs local midnight mismatch
  const parts = (dueDate.split('T')[0] ?? dueDate).split('-');
  const year = parseInt(parts[0] ?? '0', 10);
  const month = parseInt(parts[1] ?? '1', 10);
  const day = parseInt(parts[2] ?? '1', 10);
  const due = new Date(year, month - 1, day); // local midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
