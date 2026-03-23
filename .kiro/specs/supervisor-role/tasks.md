# Tasks

## Task 1: Database Migration — Extend Companies Table and Add Supervisor Role

- [x] 1.1 Create migration file `supabase/migrations/2025XXXX_add_supervisor_and_company_fields.sql`
- [x] 1.2 Add `phone TEXT`, `contact_email TEXT`, `contract_number TEXT`, `status BOOLEAN NOT NULL DEFAULT true` columns to `companies` table
- [x] 1.3 Drop existing `users_role_check` constraint and re-add with `supervisor` included in the CHECK list

## Task 2: Update TypeScript Types

- [x] 2.1 Add `'supervisor'` to the `UserRole` union type in `src/types/index.ts`
- [x] 2.2 Add `phone?: string`, `contact_email?: string`, `contract_number?: string`, `status: boolean` to the `Company` interface in `src/types/index.ts`
- [x] 2.3 Add `CompanyWithAdmin` interface to `src/types/index.ts`

## Task 3: Update Roles Utility

- [x] 3.1 Add `isSupervisor` helper function to `src/utils/roles.ts`

## Task 4: Create `create-company` Edge Function

- [x] 4.1 Create `supabase/functions/create-company/index.ts` with CORS handling
- [x] 4.2 Implement caller authorization (verify caller is supervisor via auth token + users table lookup)
- [x] 4.3 Implement request body validation (name, hierarchy_profile, phone, contact_email, contract_number)
- [x] 4.4 Implement company row insertion into `companies` table with `status: true`
- [x] 4.5 Implement Supabase Auth user creation with `contact_email` and default password `Pp123456`
- [x] 4.6 Implement `users` table row insertion with `role: 'admin'`, `company_id`, `email`, `full_name` (company name), `requires_password_change: true`
- [x] 4.7 Implement rollback logic: if any step fails, clean up previously created resources and return descriptive error
- [x] 4.8 Handle duplicate email error (return 400 with "email already in use" message)

## Task 5: Update `reset-password` Edge Function for Supervisor Access

- [x] 5.1 Modify authorization check in `supabase/functions/reset-password/index.ts` to allow callers with `role === 'supervisor'` in addition to `admin`
- [x] 5.2 Add supervisor-specific target validation: when caller is supervisor, verify target user has `role === 'admin'`; return 403 with "Supervisors can only reset admin passwords" if not
- [x] 5.3 Preserve existing admin behavior: admin callers still restricted to same-company users

## Task 6: Update Auth Service — Company Status Check on Login

- [x] 6.1 In `src/services/auth.ts` `signIn` method, after fetching user profile, query the company's `status` field if user has a `company_id`
- [x] 6.2 If company `status` is `false`, throw error with message "Your company account has been deactivated. Please contact your administrator."
- [x] 6.3 Skip company status check for users with no `company_id` (supervisors)

## Task 7: Update ProtectedRoute Component

- [x] 7.1 Add `requireSupervisor` prop to `ProtectedRouteProps` interface in `src/components/common/ProtectedRoute.tsx`
- [x] 7.2 Add supervisor to `getRoleDashboard` function returning `/supervisor/dashboard`
- [x] 7.3 Add logic: if `requireSupervisor` is true and user role is not `supervisor`, redirect to role dashboard
- [x] 7.4 Add logic: if user role is `supervisor` and route does not require supervisor, redirect to `/supervisor/dashboard`

## Task 8: Update Layout Sidebar

- [x] 8.1 Add supervisor menu section to `getMenuSections()` in `src/components/common/Layout/index.tsx` with Dashboard and Companies items
- [x] 8.2 Supervisor menu items: Dashboard → `/supervisor/dashboard`, Companies → `/supervisor/dashboard` (single page)

## Task 9: Create Supervisor Service Layer

- [x] 9.1 Create `src/services/supervisor.ts` with `createCompanyWithAdmin` method (calls create-company Edge Function)
- [x] 9.2 Add `updateCompanyStatus` method (updates company status via Supabase client)
- [x] 9.3 Add `resetAdminPassword` method (calls reset-password Edge Function)
- [x] 9.4 Add `getCompaniesWithAdmins` method (fetches companies joined with their admin users)

## Task 10: Create Supervisor Dashboard Component

- [x] 10.1 Create `src/components/supervisor/Dashboard.tsx` with company list table showing name, contact_email, contract_number, phone, status, and actions
- [x] 10.2 Implement Create Company dialog with form fields: name, hierarchy_profile (select), phone, contact_email, contract_number; validate required fields and email format
- [x] 10.3 Implement company status toggle (switch/button) that calls `updateCompanyStatus`
- [x] 10.4 Implement admin password reset button per company row that calls `resetAdminPassword` with confirmation dialog
- [x] 10.5 Display success/error feedback messages (Alert components)
- [x] 10.6 Create `src/components/supervisor/index.ts` barrel export

## Task 11: Update App Routing

- [x] 11.1 Add supervisor route `/supervisor/dashboard` in `src/App.tsx` wrapped with `ProtectedRoute requireSupervisor`
- [x] 11.2 Update `resolveDefaultRoute` in `src/App.tsx` to return `/supervisor/dashboard` for supervisor role
- [x] 11.3 Import SupervisorDashboard component in `src/App.tsx`

## Task 12: Update Organization Slice for Company Status

- [x] 12.1 Add `updateCompanyStatus` async thunk to `src/store/slices/organizationSlice.ts`
- [x] 12.2 Add corresponding reducer cases for pending/fulfilled/rejected states
