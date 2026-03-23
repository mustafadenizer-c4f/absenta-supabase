// src/utils/validation.ts
import * as yup from 'yup';

export const loginSchema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: yup
    .string()
    .required('Password is required'),
});

export const passwordResetSchema = yup.object({
  currentPassword: yup
    .string()
    .required('Current password is required'),
  newPassword: yup
    .string()
    .required('New password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('newPassword')], 'Passwords must match'),
});

export const leaveRequestSchema = yup.object({
  leaveTypeId: yup.string().required('Leave type is required'),
  startDate: yup.date().required('Start date is required'),
  endDate: yup.date()
    .required('End date is required')
    .min(yup.ref('startDate'), 'End date cannot be before start date'),
  isHalfDay: yup.boolean().default(false),
  halfDayPeriod: yup.string()
    .when('isHalfDay', {
      is: true,
      then: (schema) => schema.oneOf(['morning', 'afternoon'], 'Please select morning or afternoon').required('Half-day period is required'),
      otherwise: (schema) => schema.notRequired(),
    }),
  reason: yup.string().max(500, 'Reason cannot exceed 500 characters'),
  coveringPersonId: yup.string().notRequired(),
});