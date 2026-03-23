// src/services/leave.ts
import { supabase } from '../config/supabase';
import { User } from '../types';

export interface LeaveRequestFilters {
  status?: string;
  leaveTypeId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  company_id?: string;
  group_id?: string;
  department_id?: string;
}

export const LeaveService = {
  async getRequests(userId?: string) {
    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        leave_type:leave_type_id (*),
        user:user_id (*),
        covering_person:covering_person_id (*),
        approved_by_user:approved_by (*)
      `)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  async getRequestsByUser(
    userId: string,
    filters?: LeaveRequestFilters
  ) {
    const page = filters?.page ?? 0;
    const pageSize = filters?.pageSize ?? 10;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('leave_requests')
      .select(
        `
        *,
        leave_type:leave_type_id (*),
        user:user_id (*)
      `,
        { count: 'exact' }
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.leaveTypeId) {
      query = query.eq('leave_type_id', filters.leaveTypeId);
    }
    if (filters?.startDate) {
      query = query.gte('start_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('end_date', filters.endDate);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  },

  async getRequestsByUsers(
    userIds: string[],
    filters?: LeaveRequestFilters & { userId?: string }
  ) {
    const page = filters?.page ?? 0;
    const pageSize = filters?.pageSize ?? 10;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('leave_requests')
      .select(
        `
        *,
        leave_type:leave_type_id (*),
        user:user_id (*)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    // Filter by specific user or all provided users
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    } else {
      query = query.in('user_id', userIds);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.leaveTypeId) {
      query = query.eq('leave_type_id', filters.leaveTypeId);
    }
    if (filters?.startDate) {
      query = query.gte('start_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('end_date', filters.endDate);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  },

  async getTeamRequests(filters?: LeaveRequestFilters) {
    let query = supabase
      .from('leave_requests')
      .select(
        `
        *,
        leave_type:leave_type_id (*),
        user:user_id!inner (*)
      `,
        { count: 'exact' }
      )
      .eq('user.role', 'staff')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const page = filters?.page ?? 0;
    const pageSize = filters?.pageSize ?? 10;
    const from = page * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  },

  async createRequest(requestData: any) {
    const { data, error } = await supabase
      .from('leave_requests')
      .insert(requestData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateStatus(
    id: string,
    status: string,
    approvedBy: string,
    approvalComment?: string
  ) {
    const updateData: Record<string, any> = {
      status,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    };

    if (approvalComment !== undefined) {
      updateData.approval_comment = approvalComment;
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async cancelRequest(requestId: string) {
    const { data, error } = await supabase
      .from('leave_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async checkOverlap(
    userId: string,
    startDate: string,
    endDate: string,
    excludeRequestId?: string
  ) {
    let query = supabase
      .from('leave_requests')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'approved'])
      .lte('start_date', endDate)
      .gte('end_date', startDate);

    if (excludeRequestId) {
      query = query.neq('id', excludeRequestId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data ?? [];
  },

  async getRequestsByScope(
    currentUser: User,
    filters?: LeaveRequestFilters
  ): Promise<{ data: any[]; count: number }> {
    const page = filters?.page ?? 0;
    const pageSize = filters?.pageSize ?? 10;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const selectQuery = `
      *,
      leave_type:leave_type_id (*),
      user:user_id!inner (*)
    `;

    let query = supabase
      .from('leave_requests')
      .select(selectQuery, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    // Scope by role — each role sees requests from users who have them as manager_id
    switch (currentUser.role) {
      case 'manager':
        // Manager sees leave requests from users assigned to them
        query = query.eq('user.manager_id', currentUser.id);
        break;

      case 'department_manager':
        // Department manager sees leave requests from users assigned to them
        query = query.eq('user.manager_id', currentUser.id);
        break;

      case 'group_manager':
        // Group manager sees leave requests from users assigned to them
        query = query.eq('user.manager_id', currentUser.id);
        break;

      case 'admin':
        // Admin sees all leave requests, with optional org filters
        if (filters?.company_id) {
          query = query.eq('user.company_id', filters.company_id);
        }
        if (filters?.group_id) {
          query = query.eq('user.group_id', filters.group_id);
        }
        if (filters?.department_id) {
          query = query.eq('user.department_id', filters.department_id);
        }
        break;

      default:
        // Staff or unknown role — return empty
        return { data: [], count: 0 };
    }

    // Apply common filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.leaveTypeId) {
      query = query.eq('leave_type_id', filters.leaveTypeId);
    }
    if (filters?.startDate) {
      query = query.gte('start_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('end_date', filters.endDate);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  },

  async resolveApprover(userId: string): Promise<{ approverId: string; approverRole: string }> {
    // Fetch the user to get their manager_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role, manager_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    if (user.role === 'admin') {
      throw new Error('Admins do not have an approver');
    }

    if (!user.manager_id) {
      throw new Error('No manager assigned. Please contact your administrator.');
    }

    // Fetch the manager's role for reference
    const { data: manager, error: managerError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.manager_id)
      .single();

    if (managerError || !manager) {
      throw new Error('Assigned manager not found');
    }

    return { approverId: manager.id, approverRole: manager.role };
  },
};
