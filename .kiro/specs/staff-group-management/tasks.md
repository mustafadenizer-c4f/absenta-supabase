# Implementation Plan: Staff Group Management

## Overview

This plan implements organizational hierarchy (Company → Group → Department), extended role management (staff, manager, group_manager, general_manager, admin), manager-staff assignment, role-scoped dashboards, and cascading approval chains. Tasks are ordered so each step builds on the previous: database schema first, then types and utilities, services, Redux state, and finally UI components and routing.

## Tasks

- [x] 1. Database migration and type foundations
  - [x] 1.1 Create Supabase migration for new tables and users table alterations
    - Create `companies` table with `id`, `name`, `created_at`
    - Create `groups` table with `id`, `name`, `company_id` (FK to companies), `created_at`
    - Create `departments` table with `id`, `name`, `group_id` (FK to groups), `created_at`
    - Alter `users` table: add `role` column (TEXT, CHECK constraint for 'staff'|'manager'|'group_manager'|'general_manager'|'admin', default 'staff'), `company_id` (FK), `group_id` (FK), `department_id` (FK), `manager_id` (FK to users)
    - Migrate existing boolean flags: `is_admin=true` → role='admin', `is_manager=true AND is_admin=false` → role='manager', else → role='staff'
    - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 2.4, 3.2, 3.4, 4.1_

  - [x] 1.2 Update TypeScript types in `src/types/index.ts`
    - Add `UserRole` type: `'staff' | 'manager' | 'group_manager' | 'general_manager' | 'admin'`
    - Add `Company`, `Group`, `Department` interfaces
    - Extend `User` interface with `role`, `company_id`, `group_id`, `department_id`, `manager_id` fields
    - Keep deprecated `is_manager` and `is_admin` for backward compatibility
    - _Requirements: 1.1, 2.1, 2.2, 3.1, 3.2, 3.4, 3.5, 4.1_

  - [x] 1.3 Create role helper utility `src/utils/roles.ts`
    - Implement `isAdmin`, `isManager`, `isGroupManager`, `isGeneralManager`, `isStaff` helper functions
    - Implement `canApproveLeave` helper that checks for manager/group_manager/general_manager/admin roles
    - _Requirements: 3.1, 3.2_

  - [ ]* 1.4 Write unit tests for role helper utility
    - Test each role check function returns correct boolean for all five roles
    - Test `canApproveLeave` returns true for manager, group_manager, general_manager, admin and false for staff
    - _Requirements: 3.1, 3.2_

- [x] 2. Checkpoint - Ensure types and utilities compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Organization service and Redux slice
  - [x] 3.1 Create `src/services/organization.ts` with CRUD operations
    - Implement `getCompanies`, `createCompany`, `updateCompany`, `deleteCompany` (prevent deletion when users assigned)
    - Implement `getGroups(companyId?)`, `createGroup`, `updateGroup`, `deleteGroup` (prevent deletion when users assigned)
    - Implement `getDepartments(groupId?)`, `createDepartment`, `updateDepartment`, `deleteDepartment` (prevent deletion when users assigned)
    - _Requirements: 1.3, 1.5, 2.3, 2.4, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [x] 3.2 Create `src/store/slices/organizationSlice.ts`
    - Define `OrganizationState` with `companies`, `groups`, `departments`, `loading`, `error`
    - Create async thunks: `fetchCompanies`, `fetchGroups`, `fetchDepartments`, `createCompany`, `updateCompany`, `deleteCompany`, `createGroup`, `updateGroup`, `deleteGroup`, `createDepartment`, `updateDepartment`, `deleteDepartment`
    - Register the slice in `src/store/index.ts`
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ]* 3.3 Write unit tests for organization service delete-prevention logic
    - Test that `deleteCompany` throws when users are assigned to the company
    - Test that `deleteGroup` throws when users are assigned to the group
    - Test that `deleteDepartment` throws when users are assigned to the department
    - _Requirements: 1.5, 11.6, 11.7_

- [x] 4. Extend leave service with approval chain and scoped queries
  - [x] 4.1 Add `resolveApprover` method to `src/services/leave.ts`
    - For staff: return assigned manager (via `manager_id`); if no manager assigned, throw error
    - For manager: find group_manager in same group; if none, find general_manager in same company; if none, find admin
    - Return `{ approverId, approverRole }`
    - _Requirements: 7.1, 7.4, 8.1, 8.4, 8.5_

  - [x] 4.2 Add `getRequestsByScope` method to `src/services/leave.ts`
    - For manager role: query leave_requests where `user.manager_id = currentUser.id`
    - For group_manager role: query leave_requests where `user.group_id = currentUser.group_id`
    - For general_manager role: query leave_requests where `user.company_id = currentUser.company_id`
    - For admin role: query all leave_requests with optional company/group/department filters
    - Support pagination and status filters
    - _Requirements: 4.3, 5.2, 6.2, 9.1, 9.2_

  - [ ]* 4.3 Write unit tests for `resolveApprover` logic
    - Test staff with assigned manager returns manager
    - Test staff with no manager throws error
    - Test manager routes to group_manager, then general_manager, then admin as fallback
    - **Validates: Requirements 7.1, 7.4, 8.1, 8.4, 8.5**

- [x] 5. Checkpoint - Ensure services and state compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update existing components for role-based logic
  - [x] 6.1 Update `src/hooks/useAuth.ts` to use role field
    - Replace `isAdmin: user?.is_admin` with `isAdmin: user?.role === 'admin'`
    - Replace `isManager: user?.is_manager` with `isManager: user?.role === 'manager'`
    - Add `isGroupManager` and `isGeneralManager` computed properties
    - Add `userRole` property returning the role string
    - _Requirements: 3.1, 3.2_

  - [x] 6.2 Update `src/components/common/ProtectedRoute.tsx`
    - Add `requireGroupManager` and `requireGeneralManager` props
    - Update role-check logic to use `user.role` instead of boolean flags
    - Route group_manager to `/group-manager/dashboard` and general_manager to `/general-manager/dashboard` when access is denied
    - _Requirements: 10.5_

  - [x] 6.3 Update `src/components/common/Layout` sidebar navigation
    - Add Group Manager menu section with Dashboard, Group Approvals, Group Team View, Group Balances items
    - Add General Manager menu section with Dashboard, Company Leave View, Company Team View items
    - Show menu sections based on `user.role`
    - _Requirements: 10.1, 10.2_

  - [x] 6.4 Update `src/components/manager/Dashboard.tsx` to scope by `manager_id`
    - Replace `is_admin=false, is_manager=false` team query with `.eq('manager_id', currentUser.id)` to fetch only assigned staff
    - Update pending approvals query to scope by assigned staff
    - Update availability view to scope by assigned staff
    - _Requirements: 4.3, 4.4, 4.5_

  - [x] 6.5 Update `src/components/manager/Approvals/index.tsx` to scope by `manager_id`
    - Replace `getTeamRequests` call with `getRequestsByScope` using current user context
    - Only show leave requests from staff assigned to the current manager
    - _Requirements: 4.3_

  - [x] 6.6 Update `src/components/admin/Dashboard.tsx` to use role field
    - Replace `is_admin`/`is_manager` boolean checks with `user.role` for stats calculation
    - Add stats cards for group_manager and general_manager counts
    - _Requirements: 3.1, 3.2_

  - [x] 6.7 Update `src/components/admin/Users/index.tsx` with org assignment fields
    - Add Company dropdown (cascading: selecting company filters groups)
    - Add Group dropdown (cascading: selecting group filters departments)
    - Add Department dropdown
    - Replace 3-option role select with 5-option role select (staff, manager, group_manager, general_manager, admin)
    - Add Manager dropdown (filtered to users with role='manager') when editing a staff user
    - Update form submission to save `role`, `company_id`, `group_id`, `department_id`, `manager_id`
    - _Requirements: 1.2, 2.5, 2.6, 2.7, 3.3, 4.2_

- [x] 7. Checkpoint - Ensure updated components compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Admin CRUD screens for organizational structure
  - [x] 8.1 Create `src/components/admin/Companies/index.tsx`
    - Implement table listing all companies with create, edit, delete actions
    - Show warning and prevent deletion when users are assigned
    - Wire to organizationSlice thunks
    - _Requirements: 11.1, 1.5_

  - [x] 8.2 Create `src/components/admin/Groups/index.tsx`
    - Implement table listing groups with company filter dropdown
    - Create/edit form requires selecting a parent company
    - Show warning and prevent deletion when users are assigned
    - Wire to organizationSlice thunks
    - _Requirements: 11.2, 11.4, 11.6_

  - [x] 8.3 Create `src/components/admin/Departments/index.tsx`
    - Implement table listing departments with group filter dropdown
    - Create/edit form requires selecting a parent group
    - Show warning and prevent deletion when users are assigned
    - Wire to organizationSlice thunks
    - _Requirements: 11.3, 11.5, 11.7_

  - [ ]* 8.4 Write unit tests for admin CRUD components
    - Test that delete button is disabled or shows warning when entity has assigned users
    - Test cascading filter: selecting a company filters groups list
    - _Requirements: 11.6, 11.7, 11.4_

- [x] 9. Group Manager dashboard and views
  - [x] 9.1 Create `src/components/group-manager/Dashboard.tsx`
    - Show summary stats for all users within the group_manager's group
    - Display pending approvals count, on-leave-today count, team size
    - _Requirements: 5.1_

  - [x] 9.2 Create `src/components/group-manager/Approvals/index.tsx`
    - Show pending leave requests from managers within the group
    - Allow approve/reject with comment dialog (same pattern as existing manager Approvals)
    - Show approved/rejected requests visible from staff within the group
    - _Requirements: 5.2, 7.2, 8.3_

  - [x] 9.3 Create `src/components/group-manager/TeamView/index.tsx`
    - Show all group members in a team availability calendar view
    - _Requirements: 5.4_

  - [x] 9.4 Create `src/components/group-manager/Balances/index.tsx`
    - Show leave balances for all users within the group
    - _Requirements: 5.3_

- [x] 10. General Manager dashboard and views
  - [x] 10.1 Create `src/components/general-manager/Dashboard.tsx`
    - Show company-wide summary stats across all groups
    - Display group-level breakdown of team sizes, pending requests, on-leave counts
    - _Requirements: 6.1_

  - [x] 10.2 Create `src/components/general-manager/LeaveView/index.tsx`
    - Show all leave requests from users within the company
    - Include filter by group and department
    - Show approved requests from staff and managers (visibility per approval chain)
    - _Requirements: 6.2, 7.3, 8.2_

  - [x] 10.3 Create `src/components/general-manager/TeamView/index.tsx`
    - Show company-wide team availability view
    - _Requirements: 6.4_

  - [x] 10.4 Create `src/components/general-manager/Balances/index.tsx`
    - Show leave balances for all users within the company
    - _Requirements: 6.3_

- [x] 11. Checkpoint - Ensure new dashboards compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Admin reports and leave overview enhancements
  - [x] 12.1 Update admin reports to include org hierarchy filters
    - Add Company, Group, Department filter dropdowns to the admin reports/leave overview
    - Display requester's Company, Group, and Department alongside each leave request
    - Show leave usage statistics grouped by Company, Group, and Department
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 12.2 Add export capability for leave reports
    - Implement CSV export for filtered leave report data
    - _Requirements: 9.5_

- [x] 13. Routing and navigation wiring
  - [x] 13.1 Update `src/App.tsx` with new routes and role-based redirects
    - Add routes for `/group-manager/dashboard`, `/group-manager/approvals`, `/group-manager/team`, `/group-manager/balances`
    - Add routes for `/general-manager/dashboard`, `/general-manager/leave-view`, `/general-manager/team`, `/general-manager/balances`
    - Add routes for `/admin/companies`, `/admin/groups`, `/admin/departments`
    - Update `resolveDefaultRoute` to handle `group_manager` → `/group-manager/dashboard` and `general_manager` → `/general-manager/dashboard`
    - Wrap new routes with appropriate `ProtectedRoute` props
    - Update admin barrel exports in `src/components/admin/index.ts`
    - Create barrel exports for group-manager and general-manager component folders
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 13.2 Update leave request submission to enforce approval chain
    - In the staff leave request form, call `resolveApprover` before submission
    - If no manager is assigned, display a message and block submission
    - Store `approved_by` target from resolver when creating the request (or use it for routing display)
    - _Requirements: 7.1, 7.4_

  - [ ]* 13.3 Write integration tests for approval chain routing
    - Test staff leave request routes to assigned manager
    - Test manager leave request routes to group_manager, falls back to general_manager, then admin
    - Test staff with no manager cannot submit leave
    - **Validates: Requirements 7.1, 7.4, 8.1, 8.4, 8.5**

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The database migration (task 1.1) should be run in Supabase before testing any service layer changes
- Existing boolean flags (`is_manager`, `is_admin`) are kept on the User type for backward compatibility during migration
