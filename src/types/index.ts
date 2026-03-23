// src/types/index.ts
export type UserRole = 'staff' | 'manager' | 'group_manager' | 'department_manager' | 'admin' | 'supervisor';

export type HierarchyProfile = 'flat' | 'groups' | 'departments' | 'teams';

export interface Company {
  id: string;
  name: string;
  hierarchy_profile: HierarchyProfile;
  phone?: string;
  contact_email?: string;
  contract_number?: string;
  status: boolean;
  created_at: string;
}

export interface CompanyWithAdmin extends Company {
  admin_user?: {
    id: string;
    email: string;
    full_name: string;
  };
}

export interface Group {
  id: string;
  name: string;
  company_id: string;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  group_id: string;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  department_id: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  hire_date: string;
  birth_date?: string;
  role: UserRole;
  company_id?: string;
  group_id?: string;
  department_id?: string;
  team_id?: string;
  manager_id?: string;
  requires_password_change: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaveType {
  id: string;
  name: string;
  description?: string;
  default_days: number;
  color_code: string;
  is_active: boolean;
  company_id: string;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  half_day_period?: 'morning' | 'afternoon';
  total_days: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason?: string;
  covering_person_id?: string;
  approved_by?: string;
  approved_at?: string;
  approval_comment?: string;
  created_at: string;
  leave_type?: LeaveType;
  user?: User;
}

export interface Holiday {
  id: string;
  holiday_date: string;
  holiday_end_date: string;
  name: string;
  description?: string;
  is_recurring: boolean;
  company_id: string;
}

export interface AuthState {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ResetPasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface LeaveBalance {
  id: string;
  user_id: string;
  leave_type_id: string;
  period_start: string;
  period_end: string;
  total_earned: number;
  total_used: number;
  remaining: number;
  base_entitlement: number;
  negative_from_previous: number;
  seniority_tier?: string;
  updated_at: string;
}

export interface LeaveBalanceSummary {
  leave_type_id: string;
  leave_type_name: string;
  color_code: string;
  allocated: number;
  used: number;
  pending: number;
  remaining: number;
  period_start: string;
  period_end: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: {
    type: 'leave' | 'holiday';
    color: string;
    status?: LeaveRequest['status'];
  };
}

export interface ApprovalAction {
  requestId: string;
  action: 'approved' | 'rejected';
  comment?: string;
}

export type SeniorityTier = 'ineligible' | 'tier1' | 'tier2' | 'tier3';

export interface EnhancedLeaveBalanceSummary extends LeaveBalanceSummary {
  base_entitlement: number;
  carried_over: number;
  negative_from_previous: number;
  seniority_tier: SeniorityTier;
  seniority_years: number;
  age_at_period_start: number;
  is_age_eligible: boolean;
}

export interface CollectiveLeave {
  id: string;
  company_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  scope: 'company' | 'group' | 'department' | 'team';
  scope_id: string;
  created_by: string;
  created_at: string;
}
