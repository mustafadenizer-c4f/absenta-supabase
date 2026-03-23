import { calculateBusinessDays } from './dateUtils';
import { Holiday } from '../types';

const makeHoliday = (date: string): Holiday => ({
  id: `h-${date}`,
  holiday_date: date,
  holiday_end_date: date,
  name: 'Test Holiday',
  is_recurring: false,
  company_id: 'test-company',
});

describe('calculateBusinessDays', () => {
  it('returns 5 for a full Mon-Fri week with no holidays', () => {
    const start = new Date('2025-07-14'); // Monday
    const end = new Date('2025-07-18');   // Friday
    expect(calculateBusinessDays(start, end)).toBe(5);
  });

  it('returns 1 when start equals end on a weekday', () => {
    const date = new Date('2025-07-14'); // Monday
    expect(calculateBusinessDays(date, date)).toBe(1);
  });

  it('returns 0 when start equals end on a weekend', () => {
    const sat = new Date('2025-07-12'); // Saturday
    expect(calculateBusinessDays(sat, sat)).toBe(0);
  });

  it('excludes weekends from the count', () => {
    const start = new Date('2025-07-14'); // Monday
    const end = new Date('2025-07-20');   // Sunday (7 calendar days)
    expect(calculateBusinessDays(start, end)).toBe(5);
  });

  it('excludes holidays that fall on weekdays', () => {
    const start = new Date('2025-07-14'); // Monday
    const end = new Date('2025-07-18');   // Friday
    const holidays = [makeHoliday('2025-07-16')]; // Wednesday
    expect(calculateBusinessDays(start, end, holidays)).toBe(4);
  });

  it('does not double-count holidays on weekends', () => {
    const start = new Date('2025-07-14'); // Monday
    const end = new Date('2025-07-20');   // Sunday
    const holidays = [makeHoliday('2025-07-19')]; // Saturday — already excluded
    expect(calculateBusinessDays(start, end, holidays)).toBe(5);
  });

  it('returns 0 when start equals end on a holiday', () => {
    const date = new Date('2025-07-14'); // Monday
    const holidays = [makeHoliday('2025-07-14')];
    expect(calculateBusinessDays(date, date, holidays)).toBe(0);
  });

  it('handles multiple holidays in a range', () => {
    const start = new Date('2025-07-14'); // Monday
    const end = new Date('2025-07-18');   // Friday (5 weekdays)
    const holidays = [makeHoliday('2025-07-15'), makeHoliday('2025-07-17')];
    expect(calculateBusinessDays(start, end, holidays)).toBe(3);
  });

  it('defaults holidays to empty array (backward compatible)', () => {
    const start = new Date('2025-07-14');
    const end = new Date('2025-07-18');
    expect(calculateBusinessDays(start, end)).toBe(5);
  });
});
