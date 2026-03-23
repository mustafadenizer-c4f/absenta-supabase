# Requirements Document

## Introduction

This feature introduces organizational hierarchy (Company → Group → Department) and new management roles (Group Manager, General Manager) to the existing Leave Management System. Currently the system has three roles (Staff, Manager, Admin) with no organizational structure. This feature adds multi-company support, group/department assignment for users, and a cascading approval chain where visibility and approval authority follow the management hierarchy: Staff → Manager → Group Manager → General Manager → Admin.

## Glossary

- **System**: The Employee Leave Management application (React/TypeScript frontend with Supabase backend)
- **User**: Any person registered in the system with a profile in the `users` table
- **Staff**: A user with no management or admin privileges; submits leave requests
- **Manager**: A user responsible for a set of directly assigned staff members; approves leave requests from assigned staff
- **Group_Manager**: A user responsible for an entire organizational group; can view and oversee all staff and managers within the group
- **General_Manager**: A user with company-wide oversight; can view all groups, departments, and their leave activity
- **Admin**: A system administrator who manages users, leave types, holidays, and has access to all reports and leave views
- **Company**: A top-level organizational entity; the system supports multiple companies
- **Group**: An organizational unit within a company (e.g., "IT", "Marketing"); contains one or more departments
- **Department**: A subdivision within a group (e.g., "Cyber Security" within the "IT" group)
- **Approval_Chain**: The sequential process by which a leave request is reviewed: Staff submits → Manager approves/rejects → Group_Manager can view → General_Manager can view
- **Manager_Approval_Chain**: The process when a Manager requests leave: Manager submits → Group_Manager approves/rejects → General_Manager can view
- **Assigned_Staff**: The set of staff members directly assigned to a specific Manager
- **Users_Table**: The Supabase `users` database table storing user profiles and role information

## Requirements

### Requirement 1: Company Field on Users Table

**User Story:** As an Admin, I want to assign a company to each user, so that the system supports multi-company deployments and users are scoped to their organization.

#### Acceptance Criteria

1. THE System SHALL store a `company_id` field on each record in the Users_Table
2. WHEN an Admin creates or edits a user, THE System SHALL allow the Admin to select a Company from a list of available companies
3. THE System SHALL provide a `companies` table with `id`, `name`, and `created_at` fields
4. WHEN a User has no Company assigned, THE System SHALL display "No Company" in the user profile and management screens
5. IF a Company is deleted, THEN THE System SHALL prevent deletion when users are still assigned to the Company

### Requirement 2: Group and Department Fields on Users Table

**User Story:** As an Admin, I want to assign a group and department to each user, so that the organizational hierarchy is reflected in the system.

#### Acceptance Criteria

1. THE System SHALL store a `group_id` field on each record in the Users_Table
2. THE System SHALL store a `department_id` field on each record in the Users_Table
3. THE System SHALL provide a `groups` table with `id`, `name`, `company_id`, and `created_at` fields
4. THE System SHALL provide a `departments` table with `id`, `name`, `group_id`, and `created_at` fields
5. WHEN an Admin creates or edits a user, THE System SHALL allow the Admin to select a Group and Department from filtered dropdown lists
6. WHEN an Admin selects a Company for a user, THE System SHALL filter the Group dropdown to show only groups belonging to the selected Company
7. WHEN an Admin selects a Group for a user, THE System SHALL filter the Department dropdown to show only departments belonging to the selected Group

### Requirement 3: Role Hierarchy Extension

**User Story:** As an Admin, I want to assign Group Manager and General Manager roles to users, so that the management hierarchy supports multi-level oversight.

#### Acceptance Criteria

1. THE System SHALL support the following roles: Staff, Manager, Group_Manager, General_Manager, and Admin
2. THE System SHALL store a `role` field on each record in the Users_Table with values: `staff`, `manager`, `group_manager`, `general_manager`, `admin`
3. WHEN an Admin edits a user, THE System SHALL allow the Admin to select one of the five roles from a dropdown
4. THE System SHALL replace the existing `is_manager` and `is_admin` boolean fields with the single `role` field
5. THE System SHALL maintain backward compatibility by mapping `is_manager: true` to `manager` role and `is_admin: true` to `admin` role during migration

### Requirement 4: Manager-Staff Assignment

**User Story:** As an Admin, I want to assign staff members to specific managers, so that each manager sees only the leave requests of their assigned staff.

#### Acceptance Criteria

1. THE System SHALL store a `manager_id` field on each record in the Users_Table referencing the assigned Manager
2. WHEN an Admin edits a user with the Staff role, THE System SHALL allow the Admin to select a Manager from a list of users with the Manager role
3. WHEN a Manager logs in, THE System SHALL display only the leave requests from the Assigned_Staff of the Manager
4. WHEN a Manager views the team dashboard, THE System SHALL show only the Assigned_Staff members in the team view
5. WHEN a Manager views team balances, THE System SHALL show only the leave balances of the Assigned_Staff

### Requirement 5: Group Manager Visibility

**User Story:** As a Group Manager, I want to see all staff and managers within my group, so that I can oversee leave activity across the group.

#### Acceptance Criteria

1. WHEN a Group_Manager logs in, THE System SHALL display a dashboard showing all users within the same Group as the Group_Manager
2. WHEN a Group_Manager views leave requests, THE System SHALL show all pending, approved, and rejected leave requests from users within the Group
3. WHEN a Group_Manager views team balances, THE System SHALL show leave balances for all users within the Group
4. THE System SHALL provide the Group_Manager with a team availability view showing all group members

### Requirement 6: General Manager Visibility

**User Story:** As a General Manager, I want to see all groups, departments, and leave activity across the company, so that I have full organizational oversight.

#### Acceptance Criteria

1. WHEN a General_Manager logs in, THE System SHALL display a dashboard showing summary statistics across all groups in the Company
2. WHEN a General_Manager views leave requests, THE System SHALL show all leave requests from users within the Company
3. WHEN a General_Manager views team balances, THE System SHALL show leave balances for all users within the Company
4. THE System SHALL provide the General_Manager with a company-wide team availability view

### Requirement 7: Staff Leave Approval Chain

**User Story:** As a Staff member, I want my leave request to follow the approval chain, so that the correct manager approves my request and higher management has visibility.

#### Acceptance Criteria

1. WHEN a Staff member submits a leave request, THE System SHALL route the request to the assigned Manager for approval
2. WHEN a Manager approves a leave request, THE System SHALL make the approved request visible to the Group_Manager of the staff member's Group
3. WHEN a Manager approves a leave request, THE System SHALL make the approved request visible to the General_Manager of the staff member's Company
4. WHEN a Staff member has no assigned Manager, THE System SHALL display a message indicating that no manager is assigned and prevent leave submission
5. IF a Manager rejects a leave request, THEN THE System SHALL notify the Staff member and record the rejection with the Manager's comment

### Requirement 8: Manager Leave Approval Chain

**User Story:** As a Manager, I want to request leave and have it approved by my Group Manager, so that the approval chain applies to managers as well.

#### Acceptance Criteria

1. WHEN a Manager submits a leave request, THE System SHALL route the request to the Group_Manager of the Manager's Group for approval
2. WHEN a Group_Manager approves a Manager's leave request, THE System SHALL make the approved request visible to the General_Manager
3. WHEN a Group_Manager views pending approvals, THE System SHALL show leave requests from Managers within the Group
4. IF a Manager's Group has no Group_Manager assigned, THEN THE System SHALL route the Manager's leave request to the General_Manager for approval
5. IF no Group_Manager or General_Manager is available, THEN THE System SHALL route the Manager's leave request to the Admin for approval

### Requirement 9: Admin Reports and Leave View

**User Story:** As an Admin, I want to view reports and leave data across the entire system, so that I can monitor leave usage and generate organizational reports.

#### Acceptance Criteria

1. THE System SHALL provide the Admin with a leave overview screen showing all leave requests across all companies
2. THE System SHALL provide the Admin with filtering options by Company, Group, Department, and role
3. THE System SHALL provide the Admin with a report screen showing leave usage statistics grouped by Company, Group, and Department
4. WHEN an Admin views the leave overview, THE System SHALL display the requester's Company, Group, and Department alongside each leave request
5. THE System SHALL provide the Admin with export capability for leave reports

### Requirement 10: Navigation and Routing for New Roles

**User Story:** As a user with any role, I want to see navigation menus and dashboards appropriate to my role, so that I can access the features relevant to my responsibilities.

#### Acceptance Criteria

1. WHEN a Group_Manager logs in, THE System SHALL display a sidebar with Group Manager menu items including Dashboard, Group Approvals, Group Team View, Group Balances, and Group Reports
2. WHEN a General_Manager logs in, THE System SHALL display a sidebar with General Manager menu items including Dashboard, Company Leave View, Company Team View, and Company Reports
3. THE System SHALL route Group_Manager users to `/group-manager/dashboard` as the default landing page
4. THE System SHALL route General_Manager users to `/general-manager/dashboard` as the default landing page
5. THE System SHALL update the ProtectedRoute component to support `requireGroupManager` and `requireGeneralManager` access checks

### Requirement 11: Company, Group, and Department Management

**User Story:** As an Admin, I want to create and manage companies, groups, and departments, so that I can set up the organizational structure.

#### Acceptance Criteria

1. THE System SHALL provide an Admin screen for creating, editing, and deleting companies
2. THE System SHALL provide an Admin screen for creating, editing, and deleting groups within a company
3. THE System SHALL provide an Admin screen for creating, editing, and deleting departments within a group
4. WHEN an Admin creates a Group, THE System SHALL require the Admin to select a parent Company
5. WHEN an Admin creates a Department, THE System SHALL require the Admin to select a parent Group
6. IF an Admin attempts to delete a Group that has users assigned, THEN THE System SHALL prevent deletion and display a warning message
7. IF an Admin attempts to delete a Department that has users assigned, THEN THE System SHALL prevent deletion and display a warning message
