# Requirements Document

## Introduction

Absenta currently assumes a fixed Monday–Friday workweek across the entire application. This feature introduces a company-level workday configuration that lets an admin select which days of the week (Monday through Sunday) are workdays and which are off days. The configuration propagates to leave day calculations, calendar views, team availability grids, and the leave request form so that all parts of the app respect the company's actual working schedule.

## Glossary

- **Admin**: A user with the `admin` role who manages company-wide settings.
- **Workday_Configuration**: A company-level setting that defines which days of the week (0 = Sunday through 6 = Saturday) are workdays.
- **Workday**: A day of the week marked as a working day in the Workday_Configuration.
- **Off_Day**: A day of the week marked as a non-working day in the Workday_Configuration.
- **Settings_Page**: The admin settings page at `src/components/admin/Settings/index.tsx`.
- **Leave_Calculator**: The service and utility functions responsible for computing leave duration in business days (`src/services/balance.ts`, `src/utils/dateUtils.ts`).
- **Team_Availability_Grid**: The table on manager/group-manager/department-manager/admin dashboards showing team member leave status for upcoming workdays.
- **Calendar_View**: Any calendar component (ThreeMonthView, CalendarView, TeamCalendar) that renders day cells with visual distinction between workdays and off days.
- **Leave_Request_Form**: The form used by staff to submit leave requests, which displays a business-day count.
- **Default_Workdays**: The initial workday configuration applied when no custom configuration exists: Monday through Friday.

## Requirements

### Requirement 1: Store Workday Configuration

**User Story:** As an admin, I want the company's workday configuration to be stored persistently, so that the setting survives page reloads and is shared across all users in the company.

#### Acceptance Criteria

1. THE Workday_Configuration SHALL be stored as an array of integer day indices (0 = Sunday, 1 = Monday, …, 6 = Saturday) on the `companies` table in Supabase.
2. WHEN no Workday_Configuration has been set for a company, THE system SHALL treat Monday through Friday (indices 1, 2, 3, 4, 5) as the Default_Workdays.
3. THE Workday_Configuration SHALL require at least one Workday to be selected at all times.

### Requirement 2: Admin Workday Settings UI

**User Story:** As an admin, I want a UI on the Settings_Page to toggle each day of the week as a workday or off day, so that I can configure the company's working schedule.

#### Acceptance Criteria

1. THE Settings_Page SHALL display a "Workday Configuration" section showing all seven days of the week (Monday through Sunday) with a toggle or checkbox for each day.
2. WHEN the Settings_Page loads, THE Settings_Page SHALL display the current Workday_Configuration for the admin's company, or the Default_Workdays if none is set.
3. WHEN the Admin toggles a day and saves, THE Settings_Page SHALL persist the updated Workday_Configuration to the `companies` table in Supabase.
4. WHEN the Admin attempts to deselect all days, THE Settings_Page SHALL prevent the save and display a validation message indicating at least one workday is required.
5. WHEN the Workday_Configuration is saved successfully, THE Settings_Page SHALL display a success notification.
6. IF the save operation fails, THEN THE Settings_Page SHALL display an error notification with the failure reason.

### Requirement 3: Leave Duration Calculation Using Workday Configuration

**User Story:** As a staff member, I want leave duration to be calculated based on the company's configured workdays, so that off days are excluded from my leave balance deductions.

#### Acceptance Criteria

1. WHEN calculating business days between two dates, THE Leave_Calculator SHALL count only days whose day-of-week index is present in the Workday_Configuration.
2. WHEN calculating business days, THE Leave_Calculator SHALL continue to exclude public holidays that fall on workdays.
3. WHEN no Workday_Configuration exists for the company, THE Leave_Calculator SHALL use the Default_Workdays (Monday through Friday).
4. THE Leave_Calculator SHALL produce the same result regardless of the order of day indices in the Workday_Configuration array.

### Requirement 4: Leave Request Form Workday Count

**User Story:** As a staff member, I want the leave request form to show the correct number of business days based on the company's workday configuration, so that I know exactly how many leave days will be deducted.

#### Acceptance Criteria

1. WHEN a staff member selects a start date and end date on the Leave_Request_Form, THE Leave_Request_Form SHALL display the business day count computed using the company's Workday_Configuration.
2. WHEN a leave request is submitted, THE Leave_Request_Form SHALL calculate `total_days` using the company's Workday_Configuration.

### Requirement 5: Team Availability Grid Uses Workday Configuration

**User Story:** As a manager, I want the team availability grid to show only the company's configured workdays, so that off days are not displayed as columns.

#### Acceptance Criteria

1. THE Team_Availability_Grid SHALL display columns only for days that are present in the Workday_Configuration.
2. WHEN the Workday_Configuration changes, THE Team_Availability_Grid SHALL reflect the updated workdays on the next page load or data refresh.
3. WHEN no Workday_Configuration exists, THE Team_Availability_Grid SHALL display Monday through Friday as the Default_Workdays.

### Requirement 6: Calendar Views Distinguish Workdays from Off Days

**User Story:** As a user, I want calendar views to visually distinguish workdays from off days, so that I can easily see which days are working days.

#### Acceptance Criteria

1. THE Calendar_View SHALL apply a distinct background style to day cells that fall on an Off_Day according to the Workday_Configuration.
2. WHEN no Workday_Configuration exists, THE Calendar_View SHALL style Saturday and Sunday as Off_Days using the Default_Workdays.

### Requirement 7: Workday Configuration Available in Redux Store

**User Story:** As a developer, I want the workday configuration to be available in the Redux store, so that all components can access it without redundant API calls.

#### Acceptance Criteria

1. WHEN a user logs in, THE system SHALL fetch the Workday_Configuration for the user's company and store it in the Redux organization slice.
2. WHEN the Admin updates the Workday_Configuration, THE system SHALL update the Redux store with the new configuration immediately after a successful save.
3. THE system SHALL expose a selector that returns the Workday_Configuration array, falling back to Default_Workdays when no configuration is stored.
