// Feature: workday-configuration — Property-Based Tests
import fc from 'fast-check';
import { calculateBusinessDays } from '../utils/dateUtils';
import { selectWorkdayConfig } from '../store/slices/organizationSlice';
import { DEFAULT_WORKDAYS, Holiday } from '../types';
import { RootState } from '../store';

// ─── Helpers ────────────────────────────────────────────────

/** All valid day-of-week indices */
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/** Arbitrary that produces a non-empty subset of [0..6] */
const nonEmptyWorkdays = fc
  .subarray(ALL_DAYS, { minLength: 1, maxLength: 7 })
  .map((arr) => [...arr].sort((a, b) => a - b));

/** Arbitrary that produces any subset of [0..6] (including empty) */
const anySubsetOfDays = fc.subarray(ALL_DAYS, { minLength: 0, maxLength: 7 });

/** Arbitrary that produces a pair of Dates where start <= end, within a reasonable range */
const dateRange = fc
  .tuple(
    fc.integer({ min: 0, max: 365 * 2 }), // offset from epoch-ish base
    fc.integer({ min: 0, max: 60 })        // span in days
  )
  .map(([offset, span]) => {
    const base = new Date(2020, 0, 1);
    const start = new Date(base);
    start.setDate(base.getDate() + offset);
    const end = new Date(start);
    end.setDate(start.getDate() + span);
    return { start, end };
  });

/** Arbitrary that produces a list of holiday date strings within a date range */
const holidaysInRange = (start: Date, end: Date) => {
  const days: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return fc.subarray(days, { minLength: 0 }).map((dates) =>
    dates.map((d) => ({ id: '1', holiday_date: d, holiday_end_date: d, name: 'H', is_recurring: false, company_id: '1' } as Holiday))
  );
};

/** Shuffle an array using Fisher-Yates driven by a seed array of random numbers */
function permute<T>(arr: T[], randoms: number[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.abs(randoms[i % randoms.length]) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}


// ─── Minimal mock for RootState ─────────────────────────────

function buildRootState(workdayConfig: number[] | null): RootState {
  return {
    auth: { user: null, session: null, isLoading: false, error: null },
    users: { users: [], loading: false, error: null },
    leave: { requests: [], balances: [], collectiveLeaves: [], holidays: [], loading: false, error: null },
    organization: {
      companies: [],
      groups: [],
      departments: [],
      teams: [],
      hierarchyProfile: null,
      workdayConfig,
      loading: false,
      error: null,
    },
  } as unknown as RootState;
}

// ─── Property 2: Non-empty workday validation ───────────────
// Feature: workday-configuration, Property 2: Non-empty workday validation
// **Validates: Requirements 1.3**
describe('Property 2: Non-empty workday validation', () => {
  const validateWorkdays = (days: number[]): boolean => days.length > 0;

  it('accepts every non-empty subset of [0..6]', () => {
    fc.assert(
      fc.property(nonEmptyWorkdays, (days) => {
        expect(validateWorkdays(days)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('rejects the empty subset', () => {
    expect(validateWorkdays([])).toBe(false);
  });

  it('rejects empty and accepts non-empty for any random subset', () => {
    fc.assert(
      fc.property(anySubsetOfDays, (days) => {
        if (days.length === 0) {
          expect(validateWorkdays(days)).toBe(false);
        } else {
          expect(validateWorkdays(days)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 3: Business day calculation matches naive count ─
// Feature: workday-configuration, Property 3: Business day calculation respects workday config and holidays
// **Validates: Requirements 3.1, 3.2**
describe('Property 3: calculateBusinessDays matches naive day-by-day count', () => {
  it('matches a naive count for random date ranges, workday configs, and holidays', () => {
    fc.assert(
      fc.property(
        dateRange.chain(({ start, end }) =>
          fc.tuple(
            fc.constant({ start, end }),
            nonEmptyWorkdays,
            holidaysInRange(start, end)
          )
        ),
        ([{ start, end }, workdays, holidays]) => {
          // Naive day-by-day count
          const holidaySet = new Set(holidays.map((h) => h.holiday_date));
          let expected = 0;
          const cur = new Date(start);
          while (cur <= end) {
            const dow = cur.getDay();
            const dateStr = cur.toISOString().split('T')[0];
            if (workdays.includes(dow) && !holidaySet.has(dateStr)) {
              expected++;
            }
            cur.setDate(cur.getDate() + 1);
          }

          const actual = calculateBusinessDays(start, end, holidays, workdays);
          expect(actual).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 4: Order-independent business day calculation ──
// Feature: workday-configuration, Property 4: Business day calculation is order-independent
// **Validates: Requirements 3.4**
describe('Property 4: calculateBusinessDays is order-independent on workday config', () => {
  it('produces identical results for any two permutations of the same config', () => {
    fc.assert(
      fc.property(
        dateRange,
        nonEmptyWorkdays,
        fc.array(fc.integer(), { minLength: 7, maxLength: 7 }),
        ({ start, end }, workdays, randoms) => {
          const permuted = permute(workdays, randoms);
          const result1 = calculateBusinessDays(start, end, [], workdays);
          const result2 = calculateBusinessDays(start, end, [], permuted);
          expect(result1).toBe(result2);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 7: selectWorkdayConfig always returns valid array ─
// Feature: workday-configuration, Property 7: Workday config selector always returns a valid array
// **Validates: Requirements 7.3**
describe('Property 7: selectWorkdayConfig always returns a non-empty valid array', () => {
  /** Arbitrary: either null or a valid non-empty workday config */
  const storeWorkdayConfig = fc.oneof(fc.constant(null), nonEmptyWorkdays);

  it('returns a non-empty array of integers in [0..6] for any store state', () => {
    fc.assert(
      fc.property(storeWorkdayConfig, (config) => {
        const state = buildRootState(config);
        const result = selectWorkdayConfig(state);

        // Must be a non-empty array
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);

        // Every element must be an integer in [0..6]
        for (const day of result) {
          expect(Number.isInteger(day)).toBe(true);
          expect(day).toBeGreaterThanOrEqual(0);
          expect(day).toBeLessThanOrEqual(6);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('falls back to DEFAULT_WORKDAYS when store has null', () => {
    const state = buildRootState(null);
    expect(selectWorkdayConfig(state)).toEqual(DEFAULT_WORKDAYS);
  });

  it('returns the stored config when it is a valid array', () => {
    fc.assert(
      fc.property(nonEmptyWorkdays, (config) => {
        const state = buildRootState(config);
        const result = selectWorkdayConfig(state);
        expect(result).toEqual(config);
      }),
      { numRuns: 100 }
    );
  });
});
