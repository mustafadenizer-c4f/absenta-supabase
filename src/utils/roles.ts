import { User } from '../types';

export const isAdmin = (user: User) => user.role === 'admin';
export const isManager = (user: User) => user.role === 'manager';
export const isGroupManager = (user: User) => user.role === 'group_manager';
export const isDepartmentManager = (user: User) => user.role === 'department_manager';
export const isStaff = (user: User) => user.role === 'staff';
export const isSupervisor = (user: User) => user.role === 'supervisor';
export const canApproveLeave = (user: User) =>
  ['manager', 'group_manager', 'department_manager', 'admin'].includes(user.role);
