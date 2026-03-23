// src/hooks/useAuth.ts
import { useSelector } from 'react-redux';
import { RootState } from '../store';

export const useAuth = () => {
  const { user, session, isLoading } = useSelector((state: RootState) => state.auth);
  
  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin' || false,
    isManager: user?.role === 'manager' || false,
    isGroupManager: user?.role === 'group_manager' || false,
    isDepartmentManager: user?.role === 'department_manager' || false,
    userRole: user?.role || null,
  };
};
