# Requirements Document

## Introduction

This feature introduces a platform-level "supervisor" role to the leave management system. The Supervisor operates above the company level — they can create and manage companies, provision admin users, and control company access. Critically, the Supervisor has zero visibility into staff data, leave requests, or any leave management functionality. The Supervisor is a platform operator, not a company participant.

## Glossary

- **Supervisor**: A platform-level user with the role `supervisor`. The Supervisor is not scoped to any company and manages companies across the platform.
- **Company**: An organizational entity stored in the `companies` table in Supabase. Each company has a name, hierarchy profile, phone, contact email, contract number, and active status.
- **Admin_User**: A user with the role `admin` who is scoped to a specific company and manages that company's staff, leave types, and organizational structure.
- **Company_Status**: A boolean field (`status`) on the `companies` table. When `true`, the company is active and its members can log in. When `false`, the company is disabled and its members are blocked from logging in.
- **Contact_Email**: The email address provided during company creation, used both as the company's contact information and as the email for the automatically created Admin_User.
- **Contract_Number**: A string identifier representing the company's contract with the platform.
- **Hierarchy_Profile**: The organizational structure type for a company: `flat`, `groups`, `departments`, or `teams`.
- **Create_Company_Edge_Function**: A Supabase Edge Function that creates a company record and provisions an Admin_User in a single server-side transaction using the service role key.
- **Reset_Password_Edge_Function**: The existing Supabase Edge Function at `supabase/functions/reset-password/index.ts` that resets a user's password to a default value and sets `requires_password_change` to `true`.
- **Login_Page**: The authentication page at `/login` where users enter credentials to access the system.
- **Supervisor_Dashboard**: The main landing page for the Supervisor role, showing a list of companies and management actions.

## Requirements

### Requirement 1: Add Supervisor Role to the Type System

**User Story:** As a developer, I want the `supervisor` role to be recognized throughout the application type system, so that role-based logic can reference it consistently.

#### Acceptance Criteria

1. THE Type_System SHALL include `supervisor` as a valid value in the `UserRole` type.
2. THE Roles_Utility SHALL export an `isSupervisor` helper function that returns `true` when a given user has the `supervisor` role.
3. THE Supervisor role SHALL have `company_id` set to `null` in the `users` table, indicating platform-level scope.

### Requirement 2: Extend the Companies Table Schema

**User Story:** As a supervisor, I want companies to have phone, contact email, contract number, and status fields, so that I can track company details and control access.

#### Acceptance Criteria

1. THE Companies_Table SHALL include a `phone` column of type text that is nullable.
2. THE Companies_Table SHALL include a `contact_email` column of type text that is nullable.
3. THE Companies_Table SHALL include a `contract_number` column of type text that is nullable.
4. THE Companies_Table SHALL include a `status` column of type boolean that defaults to `true`.
5. THE Company TypeScript interface SHALL include `phone`, `contact_email`, `contract_number`, and `status` fields matching the database schema.

### Requirement 3: Supervisor Company Creation

**User Story:** As a supervisor, I want to create new companies with all required details, so that I can onboard new organizations onto the platform.

#### Acceptance Criteria

1. WHEN the Supervisor submits the company creation form, THE Create_Company_Edge_Function SHALL insert a new row into the `companies` table with the provided name, hierarchy_profile, phone, contact_email, contract_number, and status set to `true`.
2. WHEN the Supervisor submits the company creation form, THE Create_Company_Edge_Function SHALL create a Supabase Auth user using the provided contact_email and a default password of `Pp123456`.
3. WHEN the Supervisor submits the company creation form, THE Create_Company_Edge_Function SHALL insert a row into the `users` table with role `admin`, the new company's id as `company_id`, the contact_email as email, the company name as `full_name`, and `requires_password_change` set to `true`.
4. IF the contact_email already exists as a Supabase Auth user, THEN THE Create_Company_Edge_Function SHALL return an error indicating the email is already in use.
5. IF the company insertion or admin user creation fails, THEN THE Create_Company_Edge_Function SHALL roll back all changes and return a descriptive error message.
6. THE Company_Creation_Form SHALL require the Supervisor to provide: company name, hierarchy profile selection, phone, contact email, and contract number.
7. THE Company_Creation_Form SHALL validate that contact_email is a valid email format before submission.

### Requirement 4: Supervisor Company Status Management

**User Story:** As a supervisor, I want to disable a company's status, so that all members of that company are blocked from logging in.

#### Acceptance Criteria

1. WHEN the Supervisor sets a company's status to `false`, THE System SHALL update the `status` column to `false` for that company in the `companies` table.
2. WHEN the Supervisor sets a company's status to `true`, THE System SHALL update the `status` column to `true` for that company in the `companies` table.
3. THE Supervisor_Dashboard SHALL display the current status of each company as a visible indicator (active or disabled).
4. THE Supervisor_Dashboard SHALL provide a toggle or action button to change a company's status.

### Requirement 5: Login Blocking for Disabled Companies

**User Story:** As a platform operator, I want users from disabled companies to be blocked from logging in, so that access is revoked when a company is deactivated.

#### Acceptance Criteria

1. WHEN a user attempts to log in, THE Login_Page SHALL check the `status` field of the user's associated company.
2. IF the user's company has `status` set to `false`, THEN THE Login_Page SHALL reject the login attempt and display the message "Your company account has been deactivated. Please contact your administrator."
3. THE Login_Page SHALL allow login for users whose company has `status` set to `true`.
4. THE Login_Page SHALL allow login for Supervisor users regardless of company status, since Supervisor users have no associated company.

### Requirement 6: Supervisor Admin Password Reset

**User Story:** As a supervisor, I want to reset admin users' passwords, so that I can help admins regain access to their accounts.

#### Acceptance Criteria

1. THE Supervisor_Dashboard SHALL display a password reset action for each company's admin user.
2. WHEN the Supervisor triggers a password reset for an admin user, THE Reset_Password_Edge_Function SHALL reset that admin user's password to the default value `Pp123456`.
3. WHEN the Supervisor triggers a password reset for an admin user, THE Reset_Password_Edge_Function SHALL set `requires_password_change` to `true` for that admin user.
4. THE Supervisor SHALL only be able to reset passwords for users with the `admin` role.
5. WHEN the password reset succeeds, THE Supervisor_Dashboard SHALL display a success confirmation message.
6. IF the password reset fails, THEN THE Supervisor_Dashboard SHALL display a descriptive error message.

### Requirement 7: Supervisor Data Access Restriction

**User Story:** As a platform operator, I want the supervisor to have no access to staff or leave management data, so that company-internal data remains private.

#### Acceptance Criteria

1. THE Routing_System SHALL prevent the Supervisor from accessing any admin, staff, manager, group manager, or general manager routes.
2. THE Supervisor SHALL only have access to the Supervisor dashboard and company management routes.
3. THE Layout_Sidebar SHALL display only Supervisor-specific menu items (Dashboard, Companies) when the logged-in user has the `supervisor` role.
4. THE ProtectedRoute component SHALL redirect Supervisor users to the Supervisor dashboard when they attempt to access non-supervisor routes.

### Requirement 8: Supervisor Routing and Navigation

**User Story:** As a supervisor, I want dedicated routes and navigation, so that I can access my dashboard and company management pages.

#### Acceptance Criteria

1. THE Routing_System SHALL define a route at `/supervisor/dashboard` that renders the Supervisor_Dashboard.
2. THE Routing_System SHALL protect supervisor routes so that only users with the `supervisor` role can access them.
3. WHEN a Supervisor logs in, THE System SHALL redirect the Supervisor to `/supervisor/dashboard`.
4. THE ProtectedRoute component SHALL support a `requireSupervisor` prop that restricts access to users with the `supervisor` role.

### Requirement 9: Update Reset Password Edge Function for Supervisor Access

**User Story:** As a developer, I want the existing reset password Edge Function to support supervisor callers, so that supervisors can reset admin passwords.

#### Acceptance Criteria

1. THE Reset_Password_Edge_Function SHALL allow callers with the `supervisor` role to reset passwords.
2. WHEN a Supervisor calls the Reset_Password_Edge_Function, THE function SHALL verify that the target user has the `admin` role.
3. IF a Supervisor attempts to reset the password of a non-admin user, THEN THE Reset_Password_Edge_Function SHALL return a 403 error with the message "Supervisors can only reset admin passwords."
4. THE Reset_Password_Edge_Function SHALL continue to allow admin callers to reset passwords for users within their own company (existing behavior preserved).
