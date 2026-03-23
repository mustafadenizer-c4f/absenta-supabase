import {
  calculateSeniorityYears,
  getSeniorityTier,
  getBaseDaysByTier,
  calculateAge,
  isAgeEligibleForMinimum,
  calculateEntitlement,
} from './entitlementCalculator';

describe('calculateSeniorityYears', () => {
  it('returns 0 when referenceDate is before hireDate', () => {
    expect(calculateSeniorityYears('2023-06-01', '2022-01-01')).toBe(0);
  });

  it('returns 0 when less than 1 year has passed', () => {
    expect(calculateSeniorityYears('2023-06-01', '2024-05-31')).toBe(0);
  });

  it('returns 1 when exactly 1 year has passed', () => {
    expect(calculateSeniorityYears('2023-06-01', '2024-06-01')).toBe(1);
  });

  it('returns 5 at exactly 5 years', () => {
    expect(calculateSeniorityYears('2019-03-15', '2024-03-15')).toBe(5);
  });

  it('returns 14 just before 15 years', () => {
    expect(calculateSeniorityYears('2009-07-01', '2024-06-30')).toBe(14);
  });

  it('returns 15 at exactly 15 years', () => {
    expect(calculateSeniorityYears('2009-07-01', '2024-07-01')).toBe(15);
  });
});

describe('getSeniorityTier', () => {
  it('returns ineligible for < 1 year', () => {
    expect(getSeniorityTier(0)).toBe('ineligible');
    expect(getSeniorityTier(0.5)).toBe('ineligible');
  });

  it('returns tier1 for 1-5 years inclusive', () => {
    expect(getSeniorityTier(1)).toBe('tier1');
    expect(getSeniorityTier(3)).toBe('tier1');
    expect(getSeniorityTier(5)).toBe('tier1');
  });

  it('returns tier2 for > 5 and < 15 years', () => {
    expect(getSeniorityTier(6)).toBe('tier2');
    expect(getSeniorityTier(10)).toBe('tier2');
    expect(getSeniorityTier(14)).toBe('tier2');
  });

  it('returns tier3 for 15+ years', () => {
    expect(getSeniorityTier(15)).toBe('tier3');
    expect(getSeniorityTier(20)).toBe('tier3');
    expect(getSeniorityTier(30)).toBe('tier3');
  });
});

describe('getBaseDaysByTier', () => {
  it('returns 0 for ineligible', () => {
    expect(getBaseDaysByTier('ineligible')).toBe(0);
  });

  it('returns 14 for tier1', () => {
    expect(getBaseDaysByTier('tier1')).toBe(14);
  });

  it('returns 20 for tier2', () => {
    expect(getBaseDaysByTier('tier2')).toBe(20);
  });

  it('returns 26 for tier3', () => {
    expect(getBaseDaysByTier('tier3')).toBe(26);
  });
});

describe('calculateAge', () => {
  it('returns 0 when referenceDate is before birthDate', () => {
    expect(calculateAge('2000-01-01', '1999-12-31')).toBe(0);
  });

  it('returns correct age on birthday', () => {
    expect(calculateAge('1990-06-15', '2024-06-15')).toBe(34);
  });

  it('returns age minus 1 the day before birthday', () => {
    expect(calculateAge('1990-06-15', '2024-06-14')).toBe(33);
  });

  it('returns 18 for someone turning 18 on reference date', () => {
    expect(calculateAge('2006-01-01', '2024-01-01')).toBe(18);
  });

  it('returns 50 for someone turning 50 on reference date', () => {
    expect(calculateAge('1974-01-01', '2024-01-01')).toBe(50);
  });
});

describe('isAgeEligibleForMinimum', () => {
  it('returns true for age <= 18', () => {
    expect(isAgeEligibleForMinimum(16)).toBe(true);
    expect(isAgeEligibleForMinimum(18)).toBe(true);
  });

  it('returns false for ages 19-49', () => {
    expect(isAgeEligibleForMinimum(19)).toBe(false);
    expect(isAgeEligibleForMinimum(30)).toBe(false);
    expect(isAgeEligibleForMinimum(49)).toBe(false);
  });

  it('returns true for age >= 50', () => {
    expect(isAgeEligibleForMinimum(50)).toBe(true);
    expect(isAgeEligibleForMinimum(65)).toBe(true);
  });
});

describe('calculateEntitlement', () => {
  it('returns 0 entitlement for employee with < 1 year seniority', () => {
    const result = calculateEntitlement({
      hireDate: '2024-01-01',
      birthDate: '1990-01-01',
      periodStart: '2024-06-01',
    });
    expect(result.baseDays).toBe(0);
    expect(result.seniorityTier).toBe('ineligible');
    expect(result.finalEntitlement).toBe(0);
  });

  it('returns 0 for ineligible employee even if age-eligible', () => {
    const result = calculateEntitlement({
      hireDate: '2024-01-01',
      birthDate: '2007-01-01', // 17 years old
      periodStart: '2024-06-01',
    });
    expect(result.seniorityTier).toBe('ineligible');
    expect(result.isAgeEligible).toBe(true);
    expect(result.finalEntitlement).toBe(0);
  });

  it('returns 14 days for tier1 employee (1-5 years)', () => {
    const result = calculateEntitlement({
      hireDate: '2021-01-01',
      birthDate: '1990-01-01',
      periodStart: '2024-01-01',
    });
    expect(result.seniorityYears).toBe(3);
    expect(result.seniorityTier).toBe('tier1');
    expect(result.baseDays).toBe(14);
    expect(result.finalEntitlement).toBe(14);
  });

  it('returns 20 days for tier2 employee (>5 and <15 years)', () => {
    const result = calculateEntitlement({
      hireDate: '2014-01-01',
      birthDate: '1990-01-01',
      periodStart: '2024-01-01',
    });
    expect(result.seniorityYears).toBe(10);
    expect(result.seniorityTier).toBe('tier2');
    expect(result.baseDays).toBe(20);
    expect(result.finalEntitlement).toBe(20);
  });

  it('returns 26 days for tier3 employee (15+ years)', () => {
    const result = calculateEntitlement({
      hireDate: '2005-01-01',
      birthDate: '1980-01-01',
      periodStart: '2024-01-01',
    });
    expect(result.seniorityYears).toBe(19);
    expect(result.seniorityTier).toBe('tier3');
    expect(result.baseDays).toBe(26);
    expect(result.finalEntitlement).toBe(26);
  });

  it('applies age minimum of 20 for employee aged <= 18 in tier1', () => {
    const result = calculateEntitlement({
      hireDate: '2022-01-01',
      birthDate: '2006-06-01',
      periodStart: '2024-01-01',
    });
    expect(result.seniorityTier).toBe('tier1');
    expect(result.baseDays).toBe(14);
    expect(result.isAgeEligible).toBe(true);
    expect(result.finalEntitlement).toBe(20); // max(14, 20)
  });

  it('applies age minimum of 20 for employee aged >= 50 in tier1', () => {
    const result = calculateEntitlement({
      hireDate: '2021-01-01',
      birthDate: '1970-01-01',
      periodStart: '2024-01-01',
    });
    expect(result.seniorityTier).toBe('tier1');
    expect(result.baseDays).toBe(14);
    expect(result.isAgeEligible).toBe(true);
    expect(result.ageAtPeriodStart).toBe(54);
    expect(result.finalEntitlement).toBe(20); // max(14, 20)
  });

  it('uses seniority entitlement when it exceeds age minimum for age-eligible employee', () => {
    const result = calculateEntitlement({
      hireDate: '2005-01-01',
      birthDate: '1970-01-01',
      periodStart: '2024-01-01',
    });
    expect(result.seniorityTier).toBe('tier3');
    expect(result.baseDays).toBe(26);
    expect(result.isAgeEligible).toBe(true);
    expect(result.finalEntitlement).toBe(26); // max(26, 20)
  });

  it('uses seniority tier at periodStart, not at boundary crossing', () => {
    // Employee hired 2019-07-01, periodStart 2024-06-01 → 4 years (tier1)
    // Even though they'll cross to 5 years on 2024-07-01 during the period
    const result = calculateEntitlement({
      hireDate: '2019-07-01',
      birthDate: '1990-01-01',
      periodStart: '2024-06-01',
    });
    expect(result.seniorityYears).toBe(4);
    expect(result.seniorityTier).toBe('tier1');
    expect(result.finalEntitlement).toBe(14);
  });
});
