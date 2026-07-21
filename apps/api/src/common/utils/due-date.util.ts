const TZ = 'Europe/Istanbul';

function toLocalDateString(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
}

export type DueUrgency = 'overdue' | 'today' | 'soon' | 'upcoming';

export interface DueInfo {
  dueDaysRemaining: number | null;
  dueUrgency: DueUrgency | null;
}

export function computeDueInfo(dueDate: Date | null | undefined): DueInfo {
  if (!dueDate) return { dueDaysRemaining: null, dueUrgency: null };
  const todayMs = Date.parse(toLocalDateString(new Date()));
  const dueMs = Date.parse(toLocalDateString(dueDate));
  const dueDaysRemaining = Math.round((dueMs - todayMs) / 86_400_000);
  const dueUrgency: DueUrgency =
    dueDaysRemaining < 0
      ? 'overdue'
      : dueDaysRemaining === 0
        ? 'today'
        : dueDaysRemaining <= 3
          ? 'soon'
          : 'upcoming';
  return { dueDaysRemaining, dueUrgency };
}
