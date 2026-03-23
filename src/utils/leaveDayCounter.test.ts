import { expandHolidayRanges, isExcludedDate, countLeaveDays } from './leaveDayCounter';
import { Holiday } from '../types';

const makeHoliday = (start: string, end?: string): Holiday => ({
  id: `h-${start}`,
  holiday_date: start,
  holiday_end_date: end ?? start,
  name: 'Test Holiday',
  is_recurring: false,
  company_id: 'test-company',
});

describe('expandHolidayRanges', () => {
  it('returns a single date for a single-day holiday', () => {
    const result = expandHolidayRanges([makeHoliday('2025-07-15')]);
    expect(result).toEqual(new Set(['2025-07-15']));
  });

  it('expands a multi-day holiday into all dates inclusive', () => {
    const result = expandHolidayRanges([makeHoliday('2025-07-15', '2025-07-18')]);
    expect(result).toEqual(new Set(['2025-07-15', '2025-07-16', '2025-07-17', '2025-07-18']));
  });

  it('merges overlapping holidays into a single set', () => {
    const holidays = [
      makeHoliday('2025-07-15', '2025-07-17'),
      makeHoliday('2025-07-16', '2025-07-18'),
    ];
    const result = expandHolidayRanges(holidays);
    expect(result).toEqual(new Set(['2025-07-15', '2025-07-16', '2025-07-17', '2025-07-18']));
  });

  it('returns empty set for empty holidays array', () => {
    expect(expandHolidayRanges([])).toEqual(new Set());
  });
});

describe('isExcludedDate', () => {
  const holidaySet = new Set(['2025-07-15']);

  it('returns true for Saturday', () => {
    expect(isExcludedDate(new Date('2025-07-12T00:00:00'), holidaySet)).toBe(true);
  });

  it('returns true for Sunday', () => {
    expect(isExcludedDate(new Date('2025-07-13T00:00:00'), holidaySet)).toBe(true);
  });

  it('returns true for a holiday on a weekday', () => {
    expect(isExcludedDate(new Date('2025-07-15T00:00:00'), holidaySet)).toBe(true);
  });

  it('returns false for a regular weekday', () => {
    expect(isExcludedDate(new Date('2025-07-14T00:00:00'), holidaySet)).toBe(false);
  });
});

describe('countLeaveDays', () => {
  it('returns 5 for a full Mon-Fri week with no holidays', () => {
    expect(countLeaveDays({
      startDate: '2025-07-14',
      endDate: '2025-07-18',
      holidays: [],
    })).toBe(5);
  });

  it('excludes a single-day holiday on a weekday', () => {
    expect(countLeaveDays({
      startDate: '2025-07-14',
      endDate: '2025-07-18',
      holidays: [makeHoliday('2025-07-16')],
    })).toBe(4);
  });

  it('excludes a multi-day holiday spanning weekdays', () => {
    // Mon-Fri week, holiday Tue-Thu → only Mon and Fri count
    expect(countLeaveDays({
      startDate: '2025-07-14',
      endDate: '2025-07-18',
      holidays: [makeHoliday('2025-07-15', '2025-07-17')],
    })).toBe(2);
  });

  it('does not double-count holidays on weekends', () => {
    // Mon-Sun, holiday on Saturday
    expect(countLeaveDays({
      startDate: '2025-07-14',
      endDate: '2025-07-20',
      holidays: [makeHoliday('2025-07-19')],
    })).toBe(5);
  });

  it('returns 0 for a weekend-only range', () => {
    expect(countLeaveDays({
      startDate: '2025-07-12',
      endDate: '2025-07-13',
      holidays: [],
    })).toBe(0);
  });

  it('returns 1 when start equals end on a weekday', () => {
    expect(countLeaveDays({
      startDate: '2025-07-14',
      endDate: '2025-07-14',
      holidays: [],
    })).toBe(1);
  });

  it('returns 0 when start equals end on a holiday', () => {
    expect(countLeaveDays({
      startDate: '2025-07-14',
      endDate: '2025-07-14',
      holidays: [makeHoliday('2025-07-14')],
    })).toBe(0);
  });

  it('handles multi-day holiday spanning a weekend correctly', () => {
    // Holiday from Friday to Monday (4 calendar days, 2 weekdays)
    // Range: Mon 14 to Fri 25 (2 full weeks = 10 weekdays)
    // Holiday: Fri 18 to Mon 21 → excludes Fri 18 and Mon 21 = 2 weekdays
    expect(countLeaveDays({
      startDate: '2025-07-14',
      endDate: '2025-07-25',
      holidays: [makeHoliday('2025-07-18', '2025-07-21')],
    })).toBe(8);
  });
});
