// src/utils/dateUtils.ts
import { format, parseISO, isValid, addDays } from 'date-fns';
import { Holiday, DEFAULT_WORKDAYS } from '../types';

export const formatDate = (date: string | Date, formatStr: string = 'dd/MM/yyyy') => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return 'Invalid Date';
  return format(dateObj, formatStr);
};

export const calculateBusinessDays = (startDate: Date, endDate: Date, holidays: Holiday[] = [], workdays: number[] = DEFAULT_WORKDAYS): number => {
  const holidaySet = new Set<string>(holidays.map(h => h.holiday_date));

  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    const dateStr = current.toISOString().split('T')[0];
    if (workdays.includes(dayOfWeek) && !holidaySet.has(dateStr)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

export const isWeekend = (date: Date, workdays: number[] = DEFAULT_WORKDAYS): boolean => {
  return !workdays.includes(date.getDay());
};

export const addBusinessDays = (date: Date, days: number, workdays: number[] = DEFAULT_WORKDAYS): Date => {
  let result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result = addDays(result, 1);
    if (!isWeekend(result, workdays)) {
      addedDays++;
    }
  }
  
  return result;
};