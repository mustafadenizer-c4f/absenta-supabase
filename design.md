# Absenta — Staff Leave Management System

## Design Document

---

## 1. Overview

Absenta is a web-based staff leave management application that allows employees to request time off, managers to approve/reject requests, and administrators to manage users, leave types, and holidays. The system uses role-based access control with three tiers: Staff, Manager, and Admin.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript 4.9 |
| UI Framework | Material-UI (MUI) 7 + Emotion |
| State Management | Redux Toolkit 2.11 |
| Routing | React Router DOM 7 |
| Forms & Validation | React Hook Form 7 + Yup |
| Date/Calendar | date-fns, moment, react-datepicker, react-big-calendar |
| Backend / BaaS | Supabase (PostgreSQL + Auth + REST API) |
| Build Tool | Create React App (react-scripts 5) |
| Deployment | GitHub Pages (`gh-pages`) |

---

## 3. Architecture

```
src/
├── App.tsx                  # Root component, routing, providers
├── theme.ts                 # MUI theme (colors, typography, shape)
├── config/
│   └── supabase.ts          # Supabase client initialization
├── types/
│   └── index.ts             # Shared TypeScript interfaces
├── store/
│   ├── index.ts             # Redux store configuration
│   └── slices/
│       ├── authSlice.ts     # Authentication state & async thunks
│       ├── userSlice.ts     # User list state
│       └── leaveSlice.ts    # Leave requests state
├── services/
│   ├── auth.ts              # AuthService (sign in, sign out, session, password reset)
│   ├── users.ts             # UsersService (CRUD)
│   ├── leave.ts             # LeaveService (requests, status updates)
│   └── holidays.ts          # HolidaysService (CRUD)
├── hooks/
│   └── useAuth.ts           # Auth convenience hook (isAdmin, isManager, etc.)
├── utils/
│   ├── constants.ts         # App-wide constants (statuses, default password)
│   ├── dateUtils.ts         # Business day calculations, formatting
│   └── validation.ts        # Yup schemas (login, password reset, leave request)
└── components/
    ├── auth/                # Login, FirstTimeLogin, Signup, PasswordReset
    ├── common/              # Layout (AppBar + Sidebar), ProtectedRoute, ErrorBoundary, LoadingSpinner
    ├── admin/               # Dashboard, Users, LeaveTypes, Holidays, UserGuide
    ├── manager/             # Dashboard, Approvals, TeamView, Reports
    └── staff/               # Dashboard, LeaveRequest, LeaveHistory, CalendarView
```

### Key Patterns

- **Service layer**: All Supabase queries are encapsulated in service classes/objects under `src/services/`. Components and Redux thunks call services, never Supabase directly (with some exceptions in admin components that call Supabase inline — this should be refactored for consistency).
- **Redux async thunks**: API calls are dispatched via `createAsyncThunk`, with loading/error states managed in each slice.
- **Protected routing**: `ProtectedRoute` component checks auth state, role flags (`requireAdmin`, `requireManager`), and first-time password change requirement before rendering children.
- **Layout shell**: Persistent sidebar + top app bar wraps all authenticated pages. Sidebar items are dynamically generated based on user role.

---

## 4. Data Models

### 4.1 User

| Field | Type | Description |
|---|---|---|
| id | UUID | Matches Supabase Auth user ID |
| email | string | Login email |
| full_name | string | Display name |
| phone | string? | Optional contact number |
| hire_date | string (date) | Employment start date |
| is_manager | boolean | Manager role flag |
| is_admin | boolean | Admin role flag |
| requires_password_change | boolean | Forces password reset on first login |
| created_at | string (timestamp) | Record creation |
| updated_at | string (timestamp) | Last update |

### 4.2 LeaveType

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| name | string | e.g. "Annual Leave", "Sick Leave" |
| description | string? | Optional details |
| default_days | number | Annual allocation per employee |
| color_code | string | Hex color for calendar/UI display |
| is_active | boolean | Soft-delete / disable flag |

### 4.3 LeaveRequest

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → User |
| leave_type_id | UUID | FK → LeaveType |
| start_date | string (date) | Leave start |
| end_date | string (date) | Leave end |
| is_half_day | boolean | Half-day request flag |
| half_day_period | 'morning' \| 'afternoon' | Which half (if half-day) |
| total_days | number | Calculated business days |
| status | 'pending' \| 'approved' \| 'rejected' \| 'cancelled' | Current state |
| reason | string? | Employee's reason for leave |
| covering_person_id | UUID? | FK → User (colleague covering) |
| approved_by | UUID? | FK → User (manager/admin who acted) |
| approved_at | string? (timestamp) | When the decision was made |
| created_at | string (timestamp) | Submission time |

### 4.4 Holiday

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| holiday_date | string (date) | The holiday date |
| name | string | Holiday name |
| description | string? | Optional details |
| is_recurring | boolean | Repeats annually |

---

## 5. Authentication & Authorization

### 5.1 Auth Flow

1. User navigates to `/login` → enters email + password.
2. `AuthService.signIn()` authenticates via Supabase Auth, then fetches the user profile from `public.users`.
3. On success, Redux stores `user` + `session`. If `requires_password_change === true`, the user is redirected to `/first-login`.
4. On app load, `checkSession()` thunk restores the session from Supabase's persisted token.
5. Logout clears Redux state and calls `supabase.auth.signOut()`.

### 5.2 Role-Based Access

| Role | Flags | Access |
|---|---|---|
| Staff | `is_admin=false`, `is_manager=false` | Own leave requests, calendar, history, profile |
| Manager | `is_manager=true`, `is_admin=false` | Staff access + team view, approvals, reports |
| Admin | `is_admin=true` | Full access: user management, leave types, holidays, all dashboards |

### 5.3 Default Password

New users are created with password `Pp123456` and `requires_password_change=true`. On first login they must set a new password (min 8 chars, uppercase, lowercase, number).

---

## 6. Feature Inventory & Completion Status

### ✅ Complete

| Feature | Component(s) | Notes |
|---|---|---|
| Login | `Login.tsx` | Email/password form with Yup validation, show/hide password |
| First-time password reset | `FirstTimeLogin.tsx` | Enforced redirect, password strength rules |
| Session persistence | `authSlice.checkSession` | Auto-restores session on page reload |
| Admin Dashboard | `admin/Dashboard.tsx` | User stats cards, user list table, quick action buttons |
| User Management (CRUD) | `admin/Users/index.tsx` | List, create, edit, delete users; role assignment via dialog |
| Leave Types Management | `admin/LeaveTypes/index.tsx` | List, create, edit, delete; color picker, active/inactive toggle |
| User Guide | `admin/UserGuide.tsx` | Static guide for admin user management workflow |
| Test User Signup | `auth/Signup.tsx` | Dev-only utility to create test users via Supabase Auth |
| Layout (AppBar + Sidebar) | `common/Layout/index.tsx` | Responsive drawer, role-based menu items, user avatar menu |
| Protected Routes | `common/ProtectedRoute.tsx` | Auth check, role check, first-login redirect |
| Error Boundary | `common/ErrorBoundary.tsx` | Class component catch-all |
| Loading Spinner | `common/LoadingSpinner.tsx` | Centered MUI CircularProgress |
| Redux Store | `store/index.ts` + slices | Auth, users, leave slices with async thunks |
| Services Layer | `services/*` | Auth, Users, Leave, Holidays — all wired to Supabase |
| Utility Functions | `utils/*` | Date formatting, business day calc, Yup schemas, constants |
| Theme | `theme.ts` | Custom MUI theme (purple/blue palette, Roboto, rounded corners) |

### 🔲 Stub / Placeholder (Not Implemented)

| Feature | Component(s) | What's Needed |
|---|---|---|
| Staff Dashboard | `staff/Dashboard.tsx` | Leave balance summary, recent requests, quick-apply button |
| Leave Request Form | `staff/LeaveRequest/index.tsx` | Date pickers, leave type selector, half-day toggle, covering person, reason field, business day calculation, submit to Supabase |
| Leave History | `staff/LeaveHistory/index.tsx` | Filterable/sortable table of user's past requests with status chips, cancel action for pending requests |
| Calendar View | `staff/CalendarView.tsx` | `react-big-calendar` integration showing approved leaves + holidays, color-coded by leave type |
| Manager Dashboard | `manager/Dashboard.tsx` | Team overview, pending approval count, team availability summary |
| Approvals | `manager/Approvals/index.tsx` | List of pending requests from direct reports, approve/reject actions with optional comments |
| Team View | `manager/TeamView/index.tsx` | Calendar or table showing team members' leave schedules, conflict detection |
| Reports | `manager/Reports.tsx` | Leave usage statistics, exportable data, charts (per employee, per leave type, per period) |
| Holidays Management | `admin/Holidays/index.tsx` | CRUD for public holidays (service exists, UI is a stub) |
| Password Reset (forgot) | `auth/PasswordReset.tsx` | Email-based password recovery flow via Supabase |
| Profile Page | Inline placeholder in `App.tsx` | View/edit own profile, change password |
| Sidebar.tsx / Topbar.tsx | `common/Layout/Sidebar.tsx`, `Topbar.tsx` | Unused stubs — Layout/index.tsx handles everything inline |
| Staff & Manager Routes | `App.tsx` | No routes defined for `/staff/*` or `/manager/*` paths |
| Leave Balance Tracking | — | No balance/allocation model exists yet; need a `leave_balances` table or computed from requests vs. `default_days` |
| Notifications | — | No notification system (email or in-app) |
| Real-time Updates | — | Supabase supports real-time subscriptions but none are implemented |

---

## 7. Supabase Database Schema (Inferred)

Based on the service layer and types, the expected Supabase tables are:

```sql
-- users (synced with auth.users via id)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  hire_date DATE DEFAULT CURRENT_DATE,
  is_manager BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  requires_password_change BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- leave_types
CREATE TABLE public.leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  default_days INTEGER NOT NULL DEFAULT 0,
  color_code TEXT NOT NULL DEFAULT '#E06DFC',
  is_active BOOLEAN DEFAULT TRUE
);

-- leave_requests
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  leave_type_id UUID NOT NULL REFERENCES public.leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_half_day BOOLEAN DEFAULT FALSE,
  half_day_period TEXT CHECK (half_day_period IN ('morning', 'afternoon')),
  total_days NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reason TEXT,
  covering_person_id UUID REFERENCES public.users(id),
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- holidays
CREATE TABLE public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT FALSE
);
```

---

## 8. Routing Map

### Current (Implemented)

| Path | Role | Component | Status |
|---|---|---|---|
| `/login` | Public | Login | ✅ |
| `/first-login` | Authenticated | FirstTimeLogin | ✅ |
| `/` | Admin | AdminDashboard | ✅ |
| `/admin/users` | Admin | Users | ✅ |
| `/admin/leave-types` | Admin | LeaveTypes | ✅ |
| `/admin/holidays` | Admin | Holidays (placeholder) | 🔲 |
| `/profile` | Authenticated | Profile (placeholder) | 🔲 |
| `*` | — | Redirect to `/` | ✅ |

### Planned (Not Yet Routed)

| Path | Role | Component | Purpose |
|---|---|---|---|
| `/staff/dashboard` | Staff | StaffDashboard | Leave balances, recent activity |
| `/staff/request` | Staff | LeaveRequest | Submit new leave request |
| `/staff/history` | Staff | LeaveHistory | View past requests |
| `/staff/calendar` | Staff | CalendarView | Visual calendar with leaves + holidays |
| `/manager/dashboard` | Manager | ManagerDashboard | Team overview, pending counts |
| `/manager/approvals` | Manager | Approvals | Review and act on pending requests |
| `/manager/team` | Manager | TeamView | Team leave schedule |
| `/manager/reports` | Manager | Reports | Usage statistics and exports |
| `/admin/guide` | Admin | UserGuide | Already built, needs route |

---

## 9. Theme & Design Language

- Primary color: `#E06DFC` (vibrant purple)
- Secondary color: `#4427DF` (deep blue)
- Background: `#F5F7FA` (light gray)
- Font: Roboto
- Border radius: 8px globally
- Cards: subtle shadow (`0 2px 8px rgba(0,0,0,0.1)`)
- Buttons: no text-transform, medium weight
- Layout: fixed top AppBar + persistent/temporary sidebar (240px), responsive at `md` breakpoint

---

## 10. Implementation Priorities

### Phase 1 — Staff Features (Core Value)
1. Staff Dashboard (leave balances, recent requests)
2. Leave Request form (date pickers, half-day, covering person, business day calc)
3. Leave History (filterable table, cancel pending)
4. Add staff/manager routes to `App.tsx`
5. Update sidebar navigation for staff and manager roles

### Phase 2 — Manager Features
6. Manager Dashboard (team stats, pending count)
7. Approvals page (approve/reject with comments)
8. Team View (team calendar/schedule)

### Phase 3 — Remaining Admin + Polish
9. Holidays Management UI (wire up existing service)
10. Profile page (view/edit, change password)
11. Reports page (charts, export)
12. Password Reset (forgot password flow)

### Phase 4 — Enhancements
13. Leave balance tracking (allocation vs. usage)
14. Notification system (in-app or email via Supabase Edge Functions)
15. Real-time updates (Supabase subscriptions for live status changes)
16. Holiday exclusion in business day calculations
17. Clean up unused stubs (`Sidebar.tsx`, `Topbar.tsx`)
18. Consistent service usage (remove inline Supabase calls from components)

---

## 11. Known Issues & Technical Debt

- Some admin components (`Dashboard.tsx`, `Users/index.tsx`) call Supabase directly instead of going through the service layer — should be refactored for consistency.
- `Sidebar.tsx` and `Topbar.tsx` are unused stubs; the Layout `index.tsx` handles everything. These should be removed or integrated.
- The `leaveSlice` uses `any[]` for requests instead of the typed `LeaveRequest` interface.
- The `userSlice` re-declares the `User` interface locally instead of importing from `types/index.ts`.
- Both `moment` and `date-fns` are installed — pick one (date-fns is already used in utils, moment can likely be dropped).
- The root route `/` is admin-only, meaning staff and manager users hitting `/` get redirected with no landing page.
- No leave balance/allocation tracking exists — `default_days` on `LeaveType` is defined but never consumed.
- `calculateBusinessDays` doesn't account for public holidays.
- Default password `Pp123456` is hardcoded in multiple places (Login default value, Signup, constants).
