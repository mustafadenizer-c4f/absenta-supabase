// src/services/collectiveLeave.ts
import { supabase } from '../config/supabase';
import { CollectiveLeave, Holiday, User } from '../types';
import { countLeaveDays } from '../utils/leaveDayCounter';

export interface CollectiveLeaveInput {
  startDate: string;
  endDate: string;
  scope: 'company' | 'group' | 'department' | 'team';
  scopeId: string;
  companyId: string;
  createdBy: string;
}

export interface CollectiveLeaveResult {
  collectiveLeaveId: string;
  totalDays: number;
  affectedEmployees: number;
  negativeBalanceEmployees: string[];
}

/**
 * Query target employees based on the collective leave scope.
 */
async function getTargetEmployees(
  scope: CollectiveLeaveInput['scope'],
  scopeId: string
): Promise<User[]> {
  let query = supabase.from('users').select('*');

  switch (scope) {
    case 'company':
      query = query.eq('company_id', scopeId);
      break;
    case 'group':
      query = query.eq('group_id', scopeId);
      break;
    case 'department':
      query = query.eq('department_id', scopeId);
      break;
    case 'team':
      query = query.eq('team_id', scopeId);
      break;
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch holidays for a company from Supabase.
 */
async function fetchCompanyHolidays(companyId: string): Promise<Holiday[]> {
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .eq('company_id', companyId);

  if (error) throw error;
  return data ?? [];
}

/**
 * Find the annual leave type for a company.
 * Matches Turkish "Yıllık" or English "Annual" (case-insensitive).
 */
async function findAnnualLeaveType(companyId: string): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase
    .from('leave_types')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (error) throw error;

  const annualType = (data ?? []).find((lt) => {
    const lower = lt.name.toLowerCase();
    return lower.includes('yıllık') || lower.includes('annual');
  });

  return annualType ?? null;
}

/**
 * Get the current leave period for a user based on their hire date.
 */
function getCurrentPeriod(hireDate: string): { start: string; end: string } {
  const hire = new Date(hireDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisYearAnniversary = new Date(today.getFullYear(), hire.getMonth(), hire.getDate());

  let periodStart: Date;
  if (thisYearAnniversary <= today) {
    periodStart = thisYearAnniversary;
  } else {
    periodStart = new Date(today.getFullYear() - 1, hire.getMonth(), hire.getDate());
  }

  const periodEnd = new Date(periodStart);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  periodEnd.setDate(periodEnd.getDate() - 1);

  return {
    start: periodStart.toISOString().split('T')[0],
    end: periodEnd.toISOString().split('T')[0],
  };
}

export const CollectiveLeaveService = {
  /**
   * Create a collective leave: deduct days from each targeted employee's balance,
   * create individual approved leave requests, and record in collective_leaves table.
   */
  async createCollectiveLeave(input: CollectiveLeaveInput): Promise<CollectiveLeaveResult> {
    const { startDate, endDate, scope, scopeId, companyId, createdBy } = input;

    // 0. Check for duplicate collective leave (same company, scope, dates)
    const { data: existing, error: dupErr } = await supabase
      .from('collective_leaves')
      .select('id')
      .eq('company_id', companyId)
      .eq('scope', scope)
      .eq('scope_id', scopeId)
      .eq('start_date', startDate)
      .eq('end_date', endDate)
      .limit(1);
    if (dupErr) throw dupErr;
    if (existing && existing.length > 0) {
      throw new Error('A collective leave already exists for this date range and scope. Please delete the existing one first if you want to recreate it.');
    }

    // 1. Fetch holidays for the company and calculate working days
    const holidays = await fetchCompanyHolidays(companyId);
    const totalDays = countLeaveDays({ startDate, endDate, holidays });

    // 2. Find the annual leave type for this company
    const annualLeaveType = await findAnnualLeaveType(companyId);
    if (!annualLeaveType) {
      throw new Error('No active annual leave type found for this company');
    }

    // 3. Query target employees based on scope
    const employees = await getTargetEmployees(scope, scopeId);

    const negativeBalanceEmployees: string[] = [];

    // 4. For each employee: create leave request and update balance
    for (const employee of employees) {
      // Create an individual leave request with status='approved'
      const { error: reqError } = await supabase
        .from('leave_requests')
        .insert({
          user_id: employee.id,
          leave_type_id: annualLeaveType.id,
          start_date: startDate,
          end_date: endDate,
          is_half_day: false,
          total_days: totalDays,
          status: 'approved',
          reason: 'Collective leave',
          approved_by: createdBy,
          approved_at: new Date().toISOString(),
        });
      if (reqError) throw reqError;

      // Get or create the employee's leave balance for the current period
      const period = getCurrentPeriod(employee.hire_date);

      const { data: existingBalance, error: balFetchError } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', employee.id)
        .eq('leave_type_id', annualLeaveType.id)
        .eq('period_start', period.start)
        .eq('period_end', period.end)
        .maybeSingle();
      if (balFetchError) throw balFetchError;

      if (existingBalance) {
        // Check if deduction would cause negative balance
        const currentEarned = existingBalance.total_earned ?? 0;
        const currentUsed = existingBalance.total_used ?? 0;
        if ((currentEarned - currentUsed) < totalDays) {
          negativeBalanceEmployees.push(employee.id);
        }
      } else {
        // No balance record — collective leave will likely cause negative balance
        negativeBalanceEmployees.push(employee.id);
      }
    }

    // 5. Insert record into collective_leaves table
    const { data: collectiveLeave, error: clError } = await supabase
      .from('collective_leaves')
      .insert({
        company_id: companyId,
        start_date: startDate,
        end_date: endDate,
        total_days: totalDays,
        scope,
        scope_id: scopeId,
        created_by: createdBy,
      })
      .select()
      .single();
    if (clError) throw clError;

    return {
      collectiveLeaveId: collectiveLeave.id,
      totalDays,
      affectedEmployees: employees.length,
      negativeBalanceEmployees,
    };
  },

  /**
   * Get all collective leaves for a company, ordered by created_at descending.
   */
  async getCollectiveLeaves(companyId: string): Promise<CollectiveLeave[]> {
    const { data, error } = await supabase
      .from('collective_leaves')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },
};
