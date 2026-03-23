// src/components/common/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { CircularProgress, Box } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireManager?: boolean;
  requireGroupManager?: boolean;
  requireDepartmentManager?: boolean;
  requireStaff?: boolean;
  requireSupervisor?: boolean;
}

/**
 * Returns the default dashboard path for a given user role.
 */
const getRoleDashboard = (role: string): string => {
  switch (role) {
    case 'supervisor':
      return '/supervisor/dashboard';
    case 'admin':
      return '/';
    case 'department_manager':
      return '/department-manager/dashboard';
    case 'group_manager':
      return '/group-manager/dashboard';
    case 'manager':
      return '/manager/dashboard';
    default:
      return '/staff/dashboard';
  }
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  requireManager = false,
  requireGroupManager = false,
  requireDepartmentManager = false,
  requireStaff = false,
  requireSupervisor = false,
}) => {
  const { user, isLoading } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user needs password change
  if (user.requires_password_change && location.pathname !== '/first-login') {
    return <Navigate to="/first-login" replace />;
  }

  // Supervisor isolation: supervisors can only access supervisor routes
  if (user.role === 'supervisor' && !requireSupervisor) {
    return <Navigate to="/supervisor/dashboard" replace />;
  }

  // Supervisor requirement: only supervisors can access supervisor routes
  if (requireSupervisor && user.role !== 'supervisor') {
    return <Navigate to={getRoleDashboard(user.role)} replace />;
  }

  // Check admin requirement
  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to={getRoleDashboard(user.role)} replace />;
  }

  // Check department manager requirement (admin also has access)
  if (requireDepartmentManager && user.role !== 'department_manager' && user.role !== 'admin') {
    return <Navigate to={getRoleDashboard(user.role)} replace />;
  }

  // Check group manager requirement (department_manager and admin also have access)
  if (requireGroupManager && user.role !== 'group_manager' && user.role !== 'department_manager' && user.role !== 'admin') {
    return <Navigate to={getRoleDashboard(user.role)} replace />;
  }

  // Check manager requirement (group_manager, department_manager, and admin also have access)
  if (requireManager && user.role !== 'manager' && user.role !== 'group_manager' && user.role !== 'department_manager' && user.role !== 'admin') {
    return <Navigate to={getRoleDashboard(user.role)} replace />;
  }

  // Check staff requirement (staff only — not any management or admin role)
  if (requireStaff && user.role !== 'staff') {
    return <Navigate to={getRoleDashboard(user.role)} replace />;
  }

  // Check if user is trying to access first-login but doesn't need it
  if (location.pathname === '/first-login' && !user.requires_password_change) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
