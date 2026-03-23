import { SeniorityTier } from '../types';

export interface EntitlementInput {
  hireDate: string;       // ISO date string (YYYY-MM-DD)
  birthDate: string;      // ISO date string (YYYY-MM-DD)
  periodStart: string;    // Leave period start date
}

export interface EntitlementResult {
  baseDays: number;           // Base leave days by seniority (0, 14, 20, 26)
  seniorityYears: number;     // Total seniority years
  seniorityTier: SeniorityTier;
  ageAtPeriodStart: number;   // Age at period start
  isAgeEligible: boolean;     // Age ≤18 or ≥50
  finalEntitlement: number;   // max(baseDays, ageMinimum) — final entitlement
}

/**
 * Calculate full completed years between two ISO date strings.
 * Uses calendar-year logic: a year is complete when the anniversary date is reached.
 */
export function calculateSeniorityYears(hireDate: string, referenceDate: string): number {
  const hire = new Date(hireDate);
  const ref = new Date(referenceDate);

  if (ref < hire) return 0;

  let years = ref.getFullYear() - hire.getFullYear();

  const hireMonthDay = hire.getMonth() * 100 + hire.getDate();
  const refMonthDay = ref.getMonth() * 100 + ref.getDate();

  if (refMonthDay < hireMonthDay) {
    years--;
  }

  return Math.max(0, years);
}

/**
 * Determine seniority tier based on completed years of service.
 * - ineligible: < 1 year
 * - tier1: 1–5 years (inclusive)
 * - tier2: > 5 and < 15 years
 * - tier3: 15+ years
 */
export function getSeniorityTier(seniorityYears: number): SeniorityTier {
  if (seniorityYears < 1) return 'ineligible';
  if (seniorityYears <= 5) return 'tier1';
  if (seniorityYears < 15) return 'tier2';
  return 'tier3';
}

/**
 * Return base annual leave days for a given seniority tier.
 */
export function getBaseDaysByTier(tier: SeniorityTier): number {
  switch (tier) {
    case 'ineligible': return 0;
    case 'tier1': return 14;
    case 'tier2': return 20;
    case 'tier3': return 26;
  }
}

/**
 * Calculate age in full years at a reference date.
 */
export function calculateAge(birthDate: string, referenceDate: string): number {
  const birth = new Date(birthDate);
  const ref = new Date(referenceDate);

  if (ref < birth) return 0;

  let age = ref.getFullYear() - birth.getFullYear();

  const birthMonthDay = birth.getMonth() * 100 + birth.getDate();
  const refMonthDay = ref.getMonth() * 100 + ref.getDate();

  if (refMonthDay < birthMonthDay) {
    age--;
  }

  return Math.max(0, age);
}

/**
 * Check if age qualifies for the 20-day minimum (≤18 or ≥50).
 */
export function isAgeEligibleForMinimum(age: number): boolean {
  return age <= 18 || age >= 50;
}

/**
 * Main entitlement calculation combining seniority and age rules.
 * - Seniority is calculated at periodStart relative to hireDate
 * - Age is calculated at periodStart relative to birthDate
 * - If employee is ineligible (< 1 year), finalEntitlement = 0
 * - If age-eligible (≤18 or ≥50), finalEntitlement = max(baseDays, 20)
 * - Otherwise, finalEntitlement = baseDays
 */
export function calculateEntitlement(input: EntitlementInput): EntitlementResult {
  const { hireDate, birthDate, periodStart } = input;

  const seniorityYears = calculateSeniorityYears(hireDate, periodStart);
  const seniorityTier = getSeniorityTier(seniorityYears);
  const baseDays = getBaseDaysByTier(seniorityTier);
  const ageAtPeriodStart = calculateAge(birthDate, periodStart);
  const isAgeEligible = isAgeEligibleForMinimum(ageAtPeriodStart);

  const AGE_MINIMUM_DAYS = 20;
  let finalEntitlement: number;

  if (seniorityTier === 'ineligible') {
    finalEntitlement = 0;
  } else if (isAgeEligible) {
    finalEntitlement = Math.max(baseDays, AGE_MINIMUM_DAYS);
  } else {
    finalEntitlement = baseDays;
  }

  return {
    baseDays,
    seniorityYears,
    seniorityTier,
    ageAtPeriodStart,
    isAgeEligible,
    finalEntitlement,
  };
}
