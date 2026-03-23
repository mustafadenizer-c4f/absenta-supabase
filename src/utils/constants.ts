// src/utils/constants.ts
export const DEFAULT_PASSWORD = 'Pp123456';
export const APP_NAME = 'Absenta';
export const COMPANY_NAME = 'Your Company';

export const LEAVE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export const LEAVE_TYPES = {
  ANNUAL: 'Annual Leave',
  SICK: 'Sick Leave',
  CASUAL: 'Casual Leave',
} as const;

export const HALF_DAY_PERIODS = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
} as const;