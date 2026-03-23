# Implementation Plan: Staff Leave Management

## Overview

Implement all remaining staff, manager, and admin features for the Absenta leave management system. The existing codebase has a functional admin module, authentication, services layer, and Redux store. Stub components (all "Coming Soon" placeholders) need full implementations. Existing files like types, services, store slices, utils, routing, and layout need to be extended with new functionality.

## Tasks

- [x] 1. Extend types, services, and Redux infrastructure
  - [x] 1.1 Update `src/types/index.ts` — add new interfaces and extend `LeaveRequest`
    - Add `LeaveBalance` interface: `id`, `user_id`, `leave_type_id`, `year`, `allocated_days`, `carried_over`, `created_at`, `updated_at`
    - Add `LeaveBalanceSummary` interface: `leave_type_id`, `leave_type_name`, `color_code`, `allocated`, `used`, `pending`, `remaining`
    - Add `CalendarEvent` interface: `id`, `title`, `start`, `end`, `allDay`, `resource` (type, color, status)
    - Add `ApprovalAction` interface: `requestId`, `action`, `comment?`
    - Add `approval_comment?: string` to the existing `LeaveRequest` interface
    - _Existing file has: User, LeaveType, LeaveRequest, Holiday, AuthState, LoginCredentials, ResetPasswordData_
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.4_

  - [x] 1.2 Create `src/services/balance.ts` — new Balance_Service
    - Implement `getBalances(userId, year)` — fetch `leave_balances` records, compute `allocated`, `used`, `pending`, `remaining` per leave type
    - Implement `getBalance(userId, leaveTypeId, year)` — single leave type balance
    - Aggregate `used` from approved `leave_requests` and `pending` from pending `leave_requests`
    - Fall back to `leave_types.default_days` when no `leave_balances` record exists
    - _New file — no existing code_
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6_

  - [x] 1.3 Update `src/services/leave.ts` — extend existing LeaveService
    - Add `getRequestsByUser(userId, filters?)` with server-side pagination via `.range()`, status/type/date-range filtering
    - Add `getTeamRequests(filters?)` — fetch pending requests from non-admin, non-manager users with joined `user` and `leave_type` data
    - Add `cancelRequest(requestId)` — update status to `cancelled`
    - Update existing `updateStatus` to accept optional `approval_comment` parameter (currently only takes `id`, `status`, `approvedBy`)
    - Add `checkOverlap(userId, startDate, endDate, excludeRequestId?)` — detect overlapping pending/approved requests
    - _Existing file has: `getRequests(userId?)`, `createRequest(requestData)`, `updateStatus(id, status, approvedBy)`_
    - _Requirements: 4.1, 4.6, 5.5, 9.1, 9.2, 9.3, 9.4, 15.1, 15.4, 17.1_

  - [x] 1.4 Update `src/store/slices/leaveSlice.ts` — extend with new thunks and typed state
    - Change `requests: any[]` to `requests: LeaveRequest[]` (currently untyped)
    - Add `balances: LeaveBalanceSummary[]` and `holidays: Holiday[]` to state
    - Add thunks: `createLeaveRequest`, `cancelLeaveRequest`, `updateLeaveStatus`, `fetchLeaveBalances`, `fetchHolidays`
    - Invalidate balance cache on request create/cancel/status-update
    - Cache holidays after initial fetch (don't re-fetch if already loaded)
    - _Existing file has: `fetchLeaveRequests` thunk, basic loading/error state_
    - _Requirements: 17.3, 17.4_

- [x] 2. Update routing and navigation for all roles
  - [x] 2.1 Update `src/App.tsx` — add staff and manager routes
    - Import existing stub components: StaffDashboard, LeaveRequest, LeaveHistory, CalendarView, ManagerDashboard, Approvals, TeamView, Reports
    - Add routes: `/staff/dashboard`, `/staff/request`, `/staff/history`, `/staff/calendar` with staff/manager access
    - Add routes: `/manager/dashboard`, `/manager/approvals`, `/manager/team`, `/manager/reports` with manager access
    - Add route: `/admin/guide` (UserGuide component already exists)
    - Update login redirect: admin → `/`, manager → `/manager/dashboard`, staff → `/staff/dashboard` (currently all redirect to `/`)
    - Update catch-all route to redirect based on role instead of always to `/`
    - Replace inline placeholder components (`AdminHolidays`, `Profile`) with actual imports
    - _Existing file has: login, first-login, admin routes (/, /admin/users, /admin/leave-types, /admin/holidays), profile placeholder, catch-all_
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 2.2 Update `src/components/common/ProtectedRoute.tsx` — add role-based redirects
    - Add `requireStaff?: boolean` prop to interface (currently has `requireAdmin` and `requireManager`)
    - Update admin role mismatch: redirect to `/staff/dashboard` for staff, `/manager/dashboard` for managers (currently redirects to `/`)
    - Update manager role mismatch: redirect to `/staff/dashboard` for staff (currently redirects to `/`)
    - _Existing file has: auth check, loading spinner, first-login redirect, requireAdmin, requireManager guards_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.3 Update `src/components/common/Layout/index.tsx` — add role-based sidebar navigation
    - Update `getMenuItems()` to add staff items: Dashboard (`/staff/dashboard`), Request Leave (`/staff/request`), Leave History (`/staff/history`), Calendar (`/staff/calendar`)
    - Add manager items: Dashboard (`/manager/dashboard`), Approvals (`/manager/approvals`), Team View (`/manager/team`), Reports (`/manager/reports`)
    - Keep existing admin items (Dashboard, User Management, User Guide, Leave Types, Holidays)
    - Use `user.is_admin` and `user.is_manager` flags to show appropriate sections
    - Add section dividers/headers for role groups
    - _Existing file has: admin-only menu items in `getMenuItems()`, full AppBar/Drawer layout_
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 3. Implement Staff Dashboard
  - [x] 3.1 Replace stub in `src/components/staff/Dashboard.tsx`
    - Display leave balance cards per active leave type (allocated, used, pending, remaining) using `LeaveBalanceSummary`
    - Show 5 most recent leave requests with status chips (pending=orange, approved=green, rejected=red, cancelled=grey)
    - Show upcoming holidays section
    - Add quick-apply button navigating to `/staff/request`
    - Fetch balances, requests, and holidays on mount via Redux thunks
    - _Existing file: stub returning "Staff Dashboard - Coming Soon"_
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 5.7_

- [x] 4. Implement Leave Request Form
  - [x] 4.1 Update `src/utils/dateUtils.ts` — enhance `calculateBusinessDays` to accept holidays
    - Add optional `holidays: Holiday[]` parameter to existing `calculateBusinessDays(startDate, endDate)`
    - Build a `Set<string>` of holiday dates for O(1) lookup
    - Exclude holidays in addition to weekends in the loop
    - Keep backward compatible (holidays defaults to empty)
    - _Existing file has: `calculateBusinessDays(startDate, endDate)` without holiday support, plus `formatDate`, `isWeekend`, `addBusinessDays`_
    - _Requirements: 3.1, 3.2_

  - [x] 4.2 Replace stub in `src/components/staff/LeaveRequest/index.tsx`
    - Leave type dropdown (active types only, fetched from Supabase)
    - Date range picker (start/end) with real-time business day calculation using enhanced `calculateBusinessDays`
    - Half-day toggle: when enabled, lock end date to start date, show morning/afternoon selector
    - Covering person dropdown (optional, list of colleagues from users service)
    - Reason text field (max 500 chars)
    - Overlap detection: call `LeaveService.checkOverlap` before submit, show error if conflict found
    - Balance warning: show warning if `total_days > remaining` but allow submission
    - On success: clear form, show success snackbar, redirect to `/staff/history`
    - Extend `leaveRequestSchema` in validation.ts for half-day validation
    - _Existing file: stub returning "Leave Request - Coming Soon"_
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 18.3, 18.4, 18.5_

- [x] 5. Implement Leave History
  - [x] 5.1 Replace stub in `src/components/staff/LeaveHistory/index.tsx`
    - Paginated table: dates, leave type name, total days, status chip, actions column
    - Filter controls: status dropdown, leave type dropdown, date range picker
    - Sort by date or status
    - Cancel button on pending requests with confirmation dialog
    - Call `cancelLeaveRequest` thunk on confirm, refresh list
    - Status chips color-coded: pending=orange, approved=green, rejected=red, cancelled=grey
    - _Existing file: stub returning "Leave History - Coming Soon"_
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 6. Implement Calendar View
  - [x] 6.1 Replace stub in `src/components/staff/CalendarView.tsx`
    - Integrate `react-big-calendar` with `date-fns` localizer (already installed), month/week/day views
    - Map approved leave requests to `CalendarEvent` objects color-coded by `leave_type.color_code`
    - Map holidays to distinct calendar events (different styling/color)
    - Click handler to show leave request details in a MUI Dialog
    - Legend component showing leave type color mapping
    - Fetch only visible date range + 1 month buffer via `onRangeChange`
    - _Existing file: stub returning "Calendar View - Coming Soon"_
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 17.2_

- [x] 7. Implement Manager Dashboard
  - [x] 7.1 Replace stub in `src/components/manager/Dashboard.tsx`
    - Summary cards: total team members, on leave today, pending approvals count, upcoming leaves count
    - Team availability mini-calendar for current week
    - Clickable pending approvals card navigating to `/manager/approvals`
    - _Existing file: stub returning "Manager Dashboard - Coming Soon"_
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 8. Implement Approvals Page
  - [x] 8.1 Replace stub in `src/components/manager/Approvals/index.tsx`
    - Fetch pending requests from non-admin, non-manager users via `LeaveService.getTeamRequests`
    - Display list with employee name, dates, leave type, total days, reason, covering person
    - Show requester's remaining leave balance for the relevant leave type
    - Approve/reject buttons with optional comment dialog (MUI Dialog with TextField)
    - Handle stale approval: if request is no longer pending, show error snackbar and refresh
    - Prevent self-approval (hide approve/reject if `request.user_id === currentUser.id`)
    - _Existing file: stub returning "Approvals - Coming Soon"_
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 9. Implement Team View
  - [x] 9.1 Replace stub in `src/components/manager/TeamView/index.tsx`
    - Team calendar using `react-big-calendar` showing all team members' approved and pending leaves
    - Conflict detection: highlight dates where 2+ team members have overlapping leave
    - Filter by team member (multi-select dropdown)
    - _Existing file: stub returning "Team View - Coming Soon"_
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 10. Implement Holidays Management UI
  - [x] 10.1 Replace stub in `src/components/admin/Holidays/index.tsx`
    - Table listing all holidays sorted by date (use existing `HolidaysService.getAll()`)
    - Add/edit dialog with fields: name, date picker, description (optional), recurring toggle
    - Delete with confirmation dialog (use existing `HolidaysService.delete()`)
    - Wire create/update to existing `HolidaysService.create()` and `HolidaysService.update()`
    - _Existing file: stub returning "Holidays - Coming Soon". Service layer (`src/services/holidays.ts`) already has full CRUD._
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 11. Implement Profile Page
  - [x] 11.1 Create `src/components/profile/ProfilePage.tsx`
    - Display user info: full name, email (read-only), phone, hire date, role badges (Staff/Manager/Admin)
    - Edit form for name and phone fields using react-hook-form
    - Password change form: current password, new password (with strength validation from `passwordResetSchema`), confirm password
    - Use `UsersService.update` for profile edits and `supabase.auth.updateUser` for password change
    - Update the Profile route in `App.tsx` to use this component (currently an inline placeholder)
    - _New file — App.tsx currently has inline `const Profile = () => <div>Profile - Coming Soon</div>`_
    - _Requirements: 14.1, 14.2, 14.3_

- [x] 12. Implement Reports Page
  - [x] 12.1 Replace stub in `src/components/manager/Reports.tsx`
    - Charts: leave usage per employee, per leave type, per month (install and use recharts)
    - Date range filter to scope all charts and statistics
    - Export to CSV button generating a downloadable file of filtered leave data
    - _Existing file: stub returning "Reports - Coming Soon"_
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 13. Error handling, performance, and final wiring
  - [x] 13.1 Add error handling patterns across components
    - Add error snackbar with retry option for Supabase API failures (global or per-component)
    - Handle stale approval errors (request no longer pending) in Approvals component
    - Verify `ErrorBoundary` wraps the main app component tree in `App.tsx`
    - _Requirements: 16.1, 16.2, 16.3_

  - [x] 13.2 Wire server-side pagination for leave request lists
    - Update `LeaveService.getRequestsByUser` to use Supabase `.range()` for pagination
    - Wire pagination controls (page, rows per page) in LeaveHistory and Approvals components
    - _Requirements: 17.1_

  - [x] 13.3 Wire leave balance invalidation and holiday caching
    - Ensure balance data re-fetches after request create, cancel, or status update in `leaveSlice`
    - Ensure holidays are fetched once on app load and cached in Redux
    - Calendar fetches only visible range + 1 month buffer
    - _Requirements: 17.2, 17.3, 17.4_

## Notes

- Each task references specific requirements for traceability
- Tasks annotated with "Existing file" describe what's already there to guide updates
- Tasks annotated with "New file" indicate files that need to be created from scratch
- Stub components are all "Coming Soon" placeholders that need full replacement
- The project uses TypeScript, React 19, Material-UI 7, Redux Toolkit, and Supabase
- `react-big-calendar`, `date-fns`, `react-datepicker`, `react-hook-form`, and `yup` are already installed
- `recharts` needs to be installed for the Reports page
