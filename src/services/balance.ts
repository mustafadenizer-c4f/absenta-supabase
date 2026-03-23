// src/services/balance.ts
import { supabase } from '../config/supabase';
import { EnhancedLeaveBalanceSummary, SeniorityTier } from '../types';
import { calculateEntitlement } from '../utils/entitlementCalculator';

/**
 * Calculate the current leave period for a user based on their hire date.
 * The period runs from hire anniversary to hire anniversary.
 */
function getCurrentPeriod(hireDate: string): { start: string; end: string } {
  const hire = new Date(hireDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the most recent anniversary
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

/**
 * Check if a leave type name represents annual leave.
 * Matches Turkish "Yıllık" or English "Annual" (case-insensitive).
 */
function isAnnualLeaveType(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes('yıllık') || lower.includes('annual');
}

export const BalanceService = {
  getCurrentPeriod,

  async getBalances(
    userId: string,
    hireDate: string,
    birthDate: string,
    companyId?: string
  ): Promise<EnhancedLeaveBalanceSummary[]> {
    const period = getCurrentPeriod(hireDate);

    // Fetch all active leave types for the company
    let ltQuery = supabase
      .from('leave_types')
      .select('*')
      .eq('is_active', true);
    if (companyId) {
      ltQuery = ltQuery.eq('company_id', companyId);
    }
    const { data: leaveTypes, error: ltError } = await ltQuery;
    if (ltError) throw ltError;

    // Fetch leave_balances records for this user and period
    const { data: balanceRecords, error: bError } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', userId)
      .eq('period_start', period.start)
      .eq('period_end', period.end);
    if (bError) throw bError;

    // Fetch approved leave requests within the period
    const { data: approvedRequests, error: aError } = await supabase
      .from('leave_requests')
      .select('leave_type_id, total_days')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .gte('start_date', period.start)
      .lte('start_date', period.end);
    if (aError) throw aError;

    // Fetch pending leave requests within the period
    const { data: pendingRequests, error: pError } = await supabase
      .from('leave_requests')
      .select('leave_type_id, total_days')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gte('start_date', period.start)
      .lte('start_date', period.end);
    if (pError) throw pError;

    const summaries: EnhancedLeaveBalanceSummary[] = (leaveTypes || []).map((lt) => {
      const balanceRecord = (balanceRecords || []).find(
        (b) => b.leave_type_id === lt.id
      );

      const carriedOver = 0; // No carried_over column; carryover is computed
      const negativeFromPrevious = balanceRecord?.negative_from_previous ?? 0;

      let baseEntitlement: number;
      let seniorityTier: SeniorityTier = 'ineligible';
      let seniorityYears = 0;
      let ageAtPeriodStart = 0;
      let isAgeEligible = false;

      if (isAnnualLeaveType(lt.name)) {
        // Use entitlement calculator for annual leave types
        const entitlement = calculateEntitlement({
          hireDate,
          birthDate,
          periodStart: period.start,
        });
        baseEntitlement = entitlement.finalEntitlement;
        seniorityTier = entitlement.seniorityTier;
        seniorityYears = entitlement.seniorityYears;
        ageAtPeriodStart = entitlement.ageAtPeriodStart;
        isAgeEligible = entitlement.isAgeEligible;
      } else {
        // Non-annual leave types: use total_earned from DB or default_days
        baseEntitlement = balanceRecord?.total_earned ?? lt.default_days;
      }

      const allocated = baseEntitlement + carriedOver - negativeFromPrevious;

      const used = (approvedRequests || [])
        .filter((r) => r.leave_type_id === lt.id)
        .reduce((sum, r) => sum + r.total_days, 0);
      const pending = (pendingRequests || [])
        .filter((r) => r.leave_type_id === lt.id)
        .reduce((sum, r) => sum + r.total_days, 0);

      return {
        leave_type_id: lt.id,
        leave_type_name: lt.name,
        color_code: lt.color_code,
        allocated,
        used,
        pending,
        remaining: allocated - used - pending,
        period_start: period.start,
        period_end: period.end,
        base_entitlement: baseEntitlement,
        carried_over: carriedOver,
        negative_from_previous: negativeFromPrevious,
        seniority_tier: seniorityTier,
        seniority_years: seniorityYears,
        age_at_period_start: ageAtPeriodStart,
        is_age_eligible: isAgeEligible,
      };
    });

    return summaries;
  },

  async calculateCarryover(
    userId: string,
    hireDate: string,
    birthDate: string,
    leaveTypeId: string
  ): Promise<number> {
    const currentPeriod = getCurrentPeriod(hireDate);

    // Calculate previous period: ends the day before current period starts
    const currentStart = new Date(currentPeriod.start + 'T00:00:00');
    const prevEnd = new Date(currentStart);
    prevEnd.setDate(prevEnd.getDate() - 1);

    // Previous period starts one year before it ends (+1 day)
    const prevStart = new Date(prevEnd);
    prevStart.setFullYear(prevStart.getFullYear() - 1);
    prevStart.setDate(prevStart.getDate() + 1);

    // If previous period start is before hire date, this is the first period — no carryover
    const hire = new Date(hireDate + 'T00:00:00');
    if (prevStart < hire) {
      return 0;
    }

    const prevPeriodStart = prevStart.toISOString().split('T')[0];
    const prevPeriodEnd = prevEnd.toISOString().split('T')[0];

    // Query previous period balance record
    const { data: prevBalance, error: balError } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', userId)
      .eq('leave_type_id', leaveTypeId)
      .eq('period_start', prevPeriodStart)
      .eq('period_end', prevPeriodEnd)
      .maybeSingle();
    if (balError) throw balError;

    // If no balance record exists for the previous period, no carryover
    if (!prevBalance) {
      return 0;
    }

    const previousAllocated = prevBalance.total_earned ?? 0;

    // Query approved leave requests in the previous period
    const { data: approvedRequests, error: reqError } = await supabase
      .from('leave_requests')
      .select('total_days')
      .eq('user_id', userId)
      .eq('leave_type_id', leaveTypeId)
      .eq('status', 'approved')
      .gte('start_date', prevPeriodStart)
      .lte('start_date', prevPeriodEnd);
    if (reqError) throw reqError;

    const previousUsed = (approvedRequests || []).reduce(
      (sum, r) => sum + r.total_days,
      0
    );

    const difference = previousAllocated - previousUsed;

    // carried_over = max(0, previous_allocated - previous_used)
    const carriedOver = Math.max(0, difference);

    // If negative, the deficit is recorded as negative_from_previous
    // (The caller or balance update logic handles persisting this value)

    return carriedOver;
  },

  async getBalance(
    userId: string,
    leaveTypeId: string,
    hireDate: string,
    birthDate: string
  ): Promise<EnhancedLeaveBalanceSummary> {
    const period = getCurrentPeriod(hireDate);

    const { data: leaveType, error: ltError } = await supabase
      .from('leave_types')
      .select('*')
      .eq('id', leaveTypeId)
      .single();
    if (ltError) throw ltError;

    const { data: balanceRecord, error: bError } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', userId)
      .eq('leave_type_id', leaveTypeId)
      .eq('period_start', period.start)
      .eq('period_end', period.end)
      .maybeSingle();
    if (bError) throw bError;

    const { data: approvedRequests, error: aError } = await supabase
      .from('leave_requests')
      .select('total_days')
      .eq('user_id', userId)
      .eq('leave_type_id', leaveTypeId)
      .eq('status', 'approved')
      .gte('start_date', period.start)
      .lte('start_date', period.end);
    if (aError) throw aError;

    const { data: pendingRequests, error: pError } = await supabase
      .from('leave_requests')
      .select('total_days')
      .eq('user_id', userId)
      .eq('leave_type_id', leaveTypeId)
      .eq('status', 'pending')
      .gte('start_date', period.start)
      .lte('start_date', period.end);
    if (pError) throw pError;

    const carriedOver = 0; // No carried_over column; carryover is computed
    const negativeFromPrevious = balanceRecord?.negative_from_previous ?? 0;

    let baseEntitlement: number;
    let seniorityTier: SeniorityTier = 'ineligible';
    let seniorityYears = 0;
    let ageAtPeriodStart = 0;
    let isAgeEligible = false;

    if (isAnnualLeaveType(leaveType.name)) {
      const entitlement = calculateEntitlement({
        hireDate,
        birthDate,
        periodStart: period.start,
      });
      baseEntitlement = entitlement.finalEntitlement;
      seniorityTier = entitlement.seniorityTier;
      seniorityYears = entitlement.seniorityYears;
      ageAtPeriodStart = entitlement.ageAtPeriodStart;
      isAgeEligible = entitlement.isAgeEligible;
    } else {
      baseEntitlement = balanceRecord?.total_earned ?? leaveType.default_days;
    }

    const allocated = baseEntitlement + carriedOver - negativeFromPrevious;
    const used = (approvedRequests || []).reduce((sum, r) => sum + r.total_days, 0);
    const pending = (pendingRequests || []).reduce((sum, r) => sum + r.total_days, 0);

    return {
      leave_type_id: leaveType.id,
      leave_type_name: leaveType.name,
      color_code: leaveType.color_code,
      allocated,
      used,
      pending,
      remaining: allocated - used - pending,
      period_start: period.start,
      period_end: period.end,
      base_entitlement: baseEntitlement,
      carried_over: carriedOver,
      negative_from_previous: negativeFromPrevious,
      seniority_tier: seniorityTier,
      seniority_years: seniorityYears,
      age_at_period_start: ageAtPeriodStart,
      is_age_eligible: isAgeEligible,
    };
  },
};
