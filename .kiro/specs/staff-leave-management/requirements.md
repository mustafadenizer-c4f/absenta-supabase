# Requirements Document

## Introduction

Absenta is a web-based staff leave management system built with React 19, TypeScript, Material-UI, Redux Toolkit, and Supabase. The system enables employees to request time off, managers to approve or reject requests, and administrators to manage users, leave types, and holidays. This requirements document derives formal EARS-compliant requirements from the approved design, covering all four implementation phases: Staff core features, Manager workflows, Admin polish, and system-wide enhancements.

## Glossary

- **System**: The Absenta staff leave management application as a whole
- **Staff_User**: An authenticated user with `is_admin=false` and `is_manager=false`
- **Manager_User**: An authenticated user with `is_manager=true` and `is_admin=false`
- **Admin_User**: An authenticated user with `is_admin=true`
- **Leave_Request**: A record representing a staff member's request for time off, with status, dates, and type
- **Leave_Type**: A category of leave (e.g., Annual Leave, Sick Leave) with a default allocation and color code
- **Leave_Balance**: A record tracking allocated, used, pending, and remaining leave days per user, leave type, and year
- **Holiday**: A public holiday date that is excluded from business day calculations
- **Business_Day**: A weekday (Monday through Friday) that is not a public holiday
- **Half_Day_Request**: A leave request for a single date covering either the morning or afternoon period
- **Covering_Person**: A colleague designated to cover responsibilities during the requester's absence
- **Protected_Route**: A route component that enforces authentication and role-based access before rendering
- **Service_Layer**: The set of modules (`AuthService`, `UsersService`, `LeaveService`, `HolidaysService`) that encapsulate all Supabase database interactions
- **Balance_Service**: A new service module responsible for fetching and computing leave balance data
- **Calendar_Event**: A visual representation of a leave request or holiday on the calendar view
- **Approval_Action**: A manager or admin decision to approve or reject a pending leave request

## Requirements

### Requirement 1: User Authentication and Session Management

**User Story:** As a user, I want to log in with my email and password and have my session persist across page reloads, so that I can securely access the system without repeated logins.

#### Acceptance Criteria

1. WHEN a user submits valid email and password credentials, THE System SHALL authenticate the user via Supabase Auth and store the user profile and session in Redux state
2. WHEN a user with `requires_password_change=true` logs in successfully, THE System SHALL redirect the user to the `/first-login` page before granting access to any other route
3. WHEN a user completes the first-time password change with a password meeting the strength rules (minimum 8 characters, 1 uppercase, 1 lowercase, 1 number), THE System SHALL update the password, set `requires_password_change` to false, and redirect to the appropriate dashboard
4. WHEN the application loads, THE System SHALL check for an existing Supabase session and restore the authenticated state without requiring re-login
5. WHEN a user clicks logout, THE System SHALL clear the Redux state and call `supabase.auth.signOut()`
6. IF the Supabase JWT token expires during an active session, THEN THE System SHALL redirect the user to `/login`

### Requirement 2: Role-Based Access Control and Routing

**User Story:** As a system administrator, I want role-based access control enforced on all routes, so that users can only access features appropriate to their role.

#### Acceptance Criteria

1. THE Protected_Route SHALL verify that the user is authenticated before rendering any protected content
2. WHEN an unauthenticated user attempts to access a protected route, THE Protected_Route SHALL redirect the user to `/login`
3. WHEN a Staff_User attempts to access a route requiring `requireAdmin` or `requireManager`, THE Protected_Route SHALL redirect the user to `/staff/dashboard`
4. WHEN a Manager_User attempts to access a route requiring `requireAdmin`, THE Protected_Route SHALL redirect the user to `/manager/dashboard`
5. WHEN an Admin_User logs in, THE System SHALL route the user to the admin dashboard at `/`
6. WHEN a Manager_User logs in, THE System SHALL route the user to `/manager/dashboard`
7. WHEN a Staff_User logs in, THE System SHALL route the user to `/staff/dashboard`

### Requirement 3: Business Day Calculation

**User Story:** As a staff member, I want the system to accurately calculate business days excluding weekends and public holidays, so that my leave duration is computed correctly.

#### Acceptance Criteria

1. WHEN calculating business days for a date range, THE System SHALL exclude all Saturdays and Sundays from the count
2. WHEN calculating business days for a date range, THE System SHALL exclude all dates matching entries in the holidays table
3. WHEN the start date equals the end date and that date is a Business_Day, THE System SHALL return 1
4. WHEN the start date equals the end date and that date is a weekend or Holiday, THE System SHALL return 0
5. THE System SHALL return a non-negative integer for all valid date range inputs where start date is less than or equal to end date

### Requirement 4: Leave Request Submission

**User Story:** As a staff member, I want to submit leave requests with date selection, leave type, half-day option, and covering person, so that I can formally request time off.

#### Acceptance Criteria

1. WHEN a Staff_User submits a leave request with valid data, THE System SHALL create a new Leave_Request record with `status='pending'` and the computed `total_days`
2. WHEN a Staff_User selects a date range, THE System SHALL display the calculated business days in real-time using the holiday-aware `calculateBusinessDays` function
3. WHEN a Staff_User enables the half-day toggle, THE System SHALL require that start date equals end date and that a half-day period (morning or afternoon) is selected
4. WHEN a Half_Day_Request is submitted, THE System SHALL set `total_days` to 0.5
5. WHEN a Staff_User submits a leave request, THE System SHALL validate that the leave type is active, the start date is less than or equal to the end date, and the calculated business days are greater than 0
6. WHEN a Staff_User submits a leave request that overlaps with an existing pending or approved Leave_Request, THE System SHALL display a validation error identifying the conflicting request and block submission
7. WHEN a leave request is successfully submitted, THE System SHALL clear the form, show a success notification, and redirect to the leave history page
8. WHEN a Staff_User submits a leave request where `total_days` exceeds the remaining balance, THE System SHALL display a warning with the current balance but allow submission

### Requirement 5: Leave History and Cancellation

**User Story:** As a staff member, I want to view my leave request history with filtering and sorting, and cancel pending requests, so that I can track and manage my time off.

#### Acceptance Criteria

1. THE System SHALL display the Staff_User's leave requests in a paginated table with columns for dates, leave type, total days, status, and actions
2. WHEN a Staff_User applies filters, THE System SHALL filter the leave history by status, leave type, and date range
3. WHEN a Staff_User sorts the leave history, THE System SHALL sort by date or status as selected
4. WHEN a Staff_User clicks cancel on a pending Leave_Request, THE System SHALL display a confirmation dialog before proceeding
5. WHEN a Staff_User confirms cancellation of a pending Leave_Request, THE System SHALL update the request status to `cancelled`
6. WHEN a Staff_User attempts to cancel a Leave_Request that is not in `pending` status, THE System SHALL prevent the cancellation
7. THE System SHALL display status chips color-coded as: pending=orange, approved=green, rejected=red, cancelled=grey

### Requirement 6: Staff Dashboard

**User Story:** As a staff member, I want a dashboard showing my leave balances, recent requests, and upcoming holidays, so that I can quickly understand my leave situation.

#### Acceptance Criteria

1. WHEN a Staff_User navigates to `/staff/dashboard`, THE System SHALL display leave balance cards for each active Leave_Type showing allocated, used, pending, and remaining days
2. WHEN a Staff_User views the dashboard, THE System SHALL display the 5 most recent leave requests with their status
3. WHEN a Staff_User views the dashboard, THE System SHALL display upcoming holidays
4. WHEN a Staff_User clicks the quick-apply button, THE System SHALL navigate to `/staff/request`

### Requirement 7: Calendar View

**User Story:** As a staff member, I want a visual calendar showing my approved leaves and public holidays, so that I can plan my time off effectively.

#### Acceptance Criteria

1. WHEN a Staff_User navigates to `/staff/calendar`, THE System SHALL render a calendar using react-big-calendar with month, week, and day views
2. THE System SHALL display approved leave requests as Calendar_Events color-coded by Leave_Type `color_code`
3. THE System SHALL display holidays as distinct Calendar_Events visually differentiated from leave requests
4. WHEN a Staff_User clicks on a leave Calendar_Event, THE System SHALL display the leave request details
5. THE System SHALL display a legend showing the color mapping for each Leave_Type

### Requirement 8: Leave Balance Tracking

**User Story:** As a staff member, I want the system to track my leave balance per leave type and year, so that I know how many days I have remaining.

#### Acceptance Criteria

1. THE Balance_Service SHALL compute `allocated` as `leave_balances.allocated_days + leave_balances.carried_over` for a given user, leave type, and year
2. THE Balance_Service SHALL compute `used` as the sum of `total_days` from approved Leave_Requests for the given user, leave type, and year
3. THE Balance_Service SHALL compute `pending` as the sum of `total_days` from pending Leave_Requests for the given user, leave type, and year
4. THE Balance_Service SHALL compute `remaining` as `allocated - used - pending`
5. THE System SHALL enforce a unique constraint of one Leave_Balance record per (user_id, leave_type_id, year) tuple
6. WHEN no Leave_Balance record exists for a user and leave type, THE System SHALL use the Leave_Type `default_days` as the allocated amount with zero carried-over days

### Requirement 9: Manager Approvals

**User Story:** As a manager, I want to review, approve, and reject leave requests from my team, so that I can manage team availability.

#### Acceptance Criteria

1. WHEN a Manager_User navigates to `/manager/approvals`, THE System SHALL display all pending Leave_Requests from non-admin, non-manager users
2. WHEN a Manager_User clicks approve on a pending Leave_Request, THE System SHALL update the status to `approved`, set `approved_by` to the manager's user ID, and set `approved_at` to the current timestamp
3. WHEN a Manager_User clicks reject on a pending Leave_Request, THE System SHALL update the status to `rejected`, set `approved_by` to the manager's user ID, and set `approved_at` to the current timestamp
4. WHEN a Manager_User approves or rejects a request, THE System SHALL allow the manager to provide an optional comment stored in `approval_comment`
5. WHEN a Manager_User attempts to approve or reject a Leave_Request that is no longer pending, THE System SHALL display an error message and refresh the approvals list
6. THE System SHALL prevent a user from approving or rejecting their own Leave_Request
7. WHEN displaying a pending request, THE System SHALL show the requester's remaining leave balance for the relevant Leave_Type

### Requirement 10: Manager Dashboard

**User Story:** As a manager, I want a dashboard showing team statistics and pending approval counts, so that I can quickly assess team availability.

#### Acceptance Criteria

1. WHEN a Manager_User navigates to `/manager/dashboard`, THE System SHALL display summary cards showing total team members, members on leave today, pending approval count, and upcoming leaves count
2. WHEN a Manager_User views the dashboard, THE System SHALL display a team availability mini-calendar for the current week
3. WHEN a Manager_User clicks the pending approvals card, THE System SHALL navigate to `/manager/approvals`

### Requirement 11: Team View

**User Story:** As a manager, I want to see my team's leave schedules on a calendar with conflict detection, so that I can ensure adequate team coverage.

#### Acceptance Criteria

1. WHEN a Manager_User navigates to `/manager/team`, THE System SHALL display a calendar showing all team members' approved and pending leaves
2. WHEN multiple team members have overlapping leave dates, THE System SHALL visually highlight those dates as conflicts
3. WHEN a Manager_User applies a team member filter, THE System SHALL display only the selected members' leave schedules

### Requirement 12: Reports

**User Story:** As a manager, I want leave usage reports with charts and export capability, so that I can analyze team leave patterns.

#### Acceptance Criteria

1. WHEN a Manager_User navigates to `/manager/reports`, THE System SHALL display charts showing leave usage per employee, per leave type, and per month
2. WHEN a Manager_User applies a date range filter, THE System SHALL update all charts and statistics to reflect the selected period
3. WHEN a Manager_User clicks export, THE System SHALL generate a CSV file containing the filtered leave data

### Requirement 13: Holidays Management

**User Story:** As an administrator, I want to manage public holidays through a CRUD interface, so that holidays are accurately reflected in business day calculations and calendars.

#### Acceptance Criteria

1. WHEN an Admin_User navigates to `/admin/holidays`, THE System SHALL display all holidays in a table sorted by date
2. WHEN an Admin_User creates a new holiday with a name, date, optional description, and recurring flag, THE System SHALL insert the holiday record into the database
3. WHEN an Admin_User edits an existing holiday, THE System SHALL update the holiday record in the database
4. WHEN an Admin_User deletes a holiday, THE System SHALL remove the holiday record from the database
5. THE System SHALL use the holidays table data in all business day calculations

### Requirement 14: Profile Management

**User Story:** As an authenticated user, I want to view and edit my profile and change my password, so that I can keep my information up to date.

#### Acceptance Criteria

1. WHEN an authenticated user navigates to `/profile`, THE System SHALL display the user's full name, email, phone, hire date, and role badges
2. WHEN an authenticated user edits their name or phone and saves, THE System SHALL update the user record in the database
3. WHEN an authenticated user submits a password change with valid current password and a new password meeting strength rules, THE System SHALL update the password via Supabase Auth

### Requirement 15: Leave Request Status Transitions

**User Story:** As a system architect, I want leave request status transitions to follow strict rules, so that data integrity is maintained.

#### Acceptance Criteria

1. THE System SHALL allow status transitions only from `pending` to `approved`, `pending` to `rejected`, or `pending` to `cancelled`
2. THE System SHALL treat `approved`, `rejected`, and `cancelled` as terminal states with no further transitions allowed
3. WHEN a Manager_User or Admin_User changes a request status to `approved` or `rejected`, THE System SHALL verify the acting user has `is_manager=true` or `is_admin=true`
4. WHEN a Staff_User cancels a Leave_Request, THE System SHALL verify that `leave_requests.user_id` matches the authenticated user's ID

### Requirement 16: Error Handling and Recovery

**User Story:** As a user, I want clear error messages and recovery options when something goes wrong, so that I can resolve issues without losing my work.

#### Acceptance Criteria

1. IF a Supabase API call fails due to a network error, THEN THE System SHALL display an error notification with a retry option
2. IF a Manager_User attempts to approve a request that was already cancelled, THEN THE System SHALL display an error indicating the request is no longer pending and refresh the list
3. IF the application encounters an unhandled error in a component tree, THEN THE System SHALL catch the error via ErrorBoundary and display a fallback UI instead of crashing

### Requirement 17: Performance and Data Loading

**User Story:** As a user, I want the application to load data efficiently, so that I experience fast page transitions and responsive interactions.

#### Acceptance Criteria

1. THE System SHALL paginate leave request lists using server-side pagination
2. THE System SHALL fetch calendar data only for the visible date range plus a one-month buffer
3. THE System SHALL cache the holiday list in Redux after the initial fetch and reuse it across components
4. WHEN leave balance data is invalidated by a request create, update, or cancel action, THE System SHALL re-fetch the balance data

### Requirement 18: Data Validation

**User Story:** As a developer, I want consistent data validation on all user inputs, so that invalid data never reaches the database.

#### Acceptance Criteria

1. THE System SHALL validate that email addresses follow a valid format on all authentication forms
2. THE System SHALL validate that passwords meet strength rules (minimum 8 characters, 1 uppercase, 1 lowercase, 1 number) on all password fields
3. THE System SHALL validate that leave request start dates are less than or equal to end dates before submission
4. THE System SHALL validate that the reason field on leave requests does not exceed 500 characters
5. WHEN a Half_Day_Request is submitted, THE System SHALL validate that `halfDayPeriod` is either `morning` or `afternoon`
