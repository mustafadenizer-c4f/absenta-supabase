# Tasks

## Task 1: Database and Type Definitions

- [x] 1.1 Add `workday_config` column to `companies` table via SQL migration: `ALTER TABLE companies ADD COLUMN workday_config integer[];`
- [x] 1.2 Add `workday_config?: number[]` field to the `Company` interface in `src/types/index.ts`
- [x] 1.3 Add `DEFAULT_WORKDAYS` constant (`[1, 2, 3, 4, 5]`) export in `src/types/index.ts`

## Task 2: Redux Store Integration

- [x] 2.1 Add `workdayConfig: number[] | null` to `OrganizationState` in `src/store/slices/organizationSlice.ts`
- [x] 2.2 Add `setWorkdayConfig` reducer action to `organizationSlice`
- [x] 2.3 Add `selectWorkdayConfig` selector that returns `state.organization.workdayConfig ?? DEFAULT_WORKDAYS`
- [x] 2.4 Populate `workdayConfig` from company data in `fetchHierarchyProfile.fulfilled` reducer

## Task 3: Organization Service

- [x] 3.1 Add `updateWorkdayConfig(companyId: string, workdayConfig: number[]): Promise<Company>` method to `OrganizationService` in `src/services/organization.ts`

## Task 4: Date Utilities Update

- [x] 4.1 Update `calculateBusinessDays` in `src/utils/dateUtils.ts` to accept an optional `workdays: number[]` parameter (default `DEFAULT_WORKDAYS`) and use `workdays.includes(dayOfWeek)` instead of hardcoded weekend check
- [x] 4.2 Update `isWeekend` in `src/utils/dateUtils.ts` to accept an optional `workdays: number[]` parameter and return `!workdays.includes(date.getDay())`
- [x] 4.3 Update `addBusinessDays` in `src/utils/dateUtils.ts` to accept an optional `workdays` parameter and use the updated `isWeekend`

## Task 5: Admin Settings UI

- [x] 5.1 Add a "Workday Configuration" section to `src/components/admin/Settings/index.tsx` with 7 day toggle chips (Mon–Sun)
- [x] 5.2 Load initial toggle state from Redux `selectWorkdayConfig` on component mount
- [x] 5.3 Add validation: disable Save button when no days are selected, show inline message "At least one workday is required"
- [x] 5.4 Implement save handler: call `OrganizationService.updateWorkdayConfig`, dispatch `setWorkdayConfig`, show success/error Snackbar

## Task 6: Leave Request Form Integration

- [x] 6.1 Read `workdayConfig` from Redux via `selectWorkdayConfig` in `src/components/staff/LeaveRequest/index.tsx`
- [x] 6.2 Pass `workdayConfig` to `calculateBusinessDays` in the `businessDays` useMemo and in the `onSubmit` handler

## Task 7: Team Availability Grid Update

- [x] 7.1 Read `workdayConfig` from Redux in `src/components/manager/Dashboard.tsx`
- [x] 7.2 Replace hardcoded Mon–Fri loop in `buildWeekAvailability` with dynamic loop over sorted `workdayConfig`
- [x] 7.3 Update table header columns to reflect actual workday names from config

## Task 8: Calendar Views Update

- [x] 8.1 Read `workdayConfig` from Redux in `src/components/staff/CalendarView.tsx`
- [x] 8.2 Add `dayPropGetter` that applies muted background style to off-days (days not in `workdayConfig`)
- [x] 8.3 Pass `dayPropGetter` with workday-aware styling to `ThreeMonthView` in `CalendarView.tsx`

## Task 9: Property-Based Tests

- [x] 9.1 Install `fast-check` as a dev dependency
- [~] 9.2 Write property test for Property 2: non-empty workday validation (generate subsets of [0..6], assert empty rejected, non-empty accepted)
- [~] 9.3 Write property test for Property 3: `calculateBusinessDays` matches naive day-by-day count for random date ranges, workday configs, and holiday lists
- [~] 9.4 Write property test for Property 4: `calculateBusinessDays` produces identical results for any two permutations of the same workday config
- [~] 9.5 Write property test for Property 7: `selectWorkdayConfig` always returns a non-empty valid array for any store state (`null` or valid array)

## Task 10: Unit Tests

- [~] 10.1 Write unit test: `selectWorkdayConfig` returns `[1,2,3,4,5]` when store has `null`
- [~] 10.2 Write unit test: `calculateBusinessDays` with default config matches legacy Mon–Fri behavior
- [~] 10.3 Write unit test: `calculateBusinessDays` with Sun–Thu config excludes Fri/Sat
- [~] 10.4 Write unit test: Admin Settings renders 7 day toggles and pre-checks correct days from Redux state
- [~] 10.5 Write unit test: Save button disabled when no days selected in Admin Settings
