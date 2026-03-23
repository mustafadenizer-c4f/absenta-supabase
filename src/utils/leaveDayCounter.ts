import { Holiday } from '../types';

export interface LeaveDayCountInput {
  startDate: string;  // ISO date string
  endDate: string;    // ISO date string
  holidays: Holiday[];
}

/** Format a Date as YYYY-MM-DD using local date parts (timezone-safe). */
function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Expand holidays that have holiday_date and holiday_end_date into a Set
 * of all individual date strings (YYYY-MM-DD format).
 */
export function expandHolidayRanges(holidays: Holiday[]): Set<string> {
  const dateSet = new Set<string>();

  for (const holiday of holidays) {
    const start = new Date(holiday.holiday_date + 'T00:00:00');
    const end = holiday.holiday_end_date
      ? new Date(holiday.holiday_end_date + 'T00:00:00')
      : start;

    const current = new Date(start);
    while (current <= end) {
      dateSet.add(toDateString(current));
      current.setDate(current.getDate() + 1);
    }
  }

  return dateSet;
}

/**
 * Return true if the date is a Saturday, Sunday, or in the holiday set.
 */
export function isExcludedDate(date: Date, holidaySet: Set<string>): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return true;
  return holidaySet.has(toDateString(date));
}

/**
 * Count net working days in a date range, excluding weekends and holidays.
 * Multi-day holidays are supported via expandHolidayRanges.
 */
export function countLeaveDays(input: LeaveDayCountInput): number {
  const holidaySet = expandHolidayRanges(input.holidays);
  const start = new Date(input.startDate + 'T00:00:00');
  const end = new Date(input.endDate + 'T00:00:00');

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    if (!isExcludedDate(current, holidaySet)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}
