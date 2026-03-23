// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { store, RootState, AppDispatch } from './store';
import { checkSession } from './store/slices/authSlice';
import { fetchHolidays } from './store/slices/leaveSlice';
import theme from './theme';
import { User } from './types';

// Auth components
import Login from './components/auth/Login';
import FirstTimeLogin from './components/auth/FirstTimeLogin';

// Common components
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/common/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';

// Admin components
import AdminDashboard from './components/admin/Dashboard';
import { LeaveTypes, Users, Holidays, AdminReports, Groups, Departments, Teams, AdminSettings, AdminApprovals, AdminTeamCalendar } from './components/admin';
import UserGuide from './components/admin/UserGuide';
import CollectiveLeavePage from './components/admin/CollectiveLeave';

// Staff components
import { StaffDashboard, LeaveRequest, LeaveHistory, CalendarView } from './components/staff';

// Manager components
import { ManagerDashboard, Approvals, TeamView, Reports, TeamBalances } from './components/manager';

// Group Manager components
import { GroupManagerDashboard, GroupManagerApprovals, GroupManagerTeamView, GroupBalances } from './components/group-manager';

// General Manager components
import { GeneralManagerDashboard, GeneralManagerTeamView, CompanyBalances, DepartmentManagerApprovals } from './components/general-manager';

// Supervisor components
import { SupervisorDashboard } from './components/supervisor';

// Profile component
import ProfilePage from './components/profile/ProfilePage';

/** Returns the default dashboard route for a given user role. */
function resolveDefaultRoute(user: User): string {
  switch (user.role) {
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
}

// App content with router
const AppContent: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(checkSession());
  }, [dispatch]);

  // Fetch holidays once on app load when user is authenticated (Req 17.3)
  useEffect(() => {
    if (user) {
      dispatch(fetchHolidays(user.company_id));
    }
  }, [dispatch, user]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={
          user ? <Navigate to={resolveDefaultRoute(user)} replace /> : <Login />
        } />

        {/* First-time login (password reset) */}
        <Route path="/first-login" element={
          <ProtectedRoute>
            <FirstTimeLogin />
          </ProtectedRoute>
        } />

        {/* ===== Admin routes ===== */}
        <Route path="/" element={
          <ProtectedRoute requireAdmin>
            <Layout>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute requireAdmin>
            <Layout>
              <Users />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/leave-types" element={
          <ProtectedRoute requireAdmin>
            <Layout>
              <LeaveTypes />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/holidays" element={
          <ProtectedRoute requireAdmin>
            <Layout>
              <Holidays />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/reports" element={
          <ProtectedRoute requireAdmin>
            <Layout>
              <AdminReports />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/guide" element={
          <ProtectedRoute requireAdmin>
            <Layout>
              <UserGuide />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/groups" element={
          <ProtectedRoute requireAdmin>
            <Layout>
              <Groups />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/departments" element={
          <ProtectedRoute requireAdmin>
            <Layout>
              <Departments />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/teams" element={
          <ProtectedRoute requireAdmin>
            <Layout>
              <Teams />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/settings" element={
          <ProtectedRoute requireAdmin>
            <Layout>
              <AdminSettings />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/approvals" element={
          <ProtectedRoute requireAdmin>
            <Layout>
              <AdminApprovals />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/calendar" element={
          <ProtectedRoute requireAdmin>
            <Layout>
              <AdminTeamCalendar />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/collective-leave" element={
          <ProtectedRoute requireAdmin>
            <Layout>
              <CollectiveLeavePage />
            </Layout>
          </ProtectedRoute>
        } />

        {/* ===== Supervisor routes ===== */}
        <Route path="/supervisor/dashboard" element={
          <ProtectedRoute requireSupervisor>
            <Layout>
              <SupervisorDashboard />
            </Layout>
          </ProtectedRoute>
        } />

        {/* ===== Group Manager routes ===== */}
        <Route path="/group-manager/dashboard" element={
          <ProtectedRoute requireGroupManager>
            <Layout>
              <GroupManagerDashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/group-manager/approvals" element={
          <ProtectedRoute requireGroupManager>
            <Layout>
              <GroupManagerApprovals />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/group-manager/team" element={
          <ProtectedRoute requireGroupManager>
            <Layout>
              <GroupManagerTeamView />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/group-manager/balances" element={
          <ProtectedRoute requireGroupManager>
            <Layout>
              <GroupBalances />
            </Layout>
          </ProtectedRoute>
        } />

        {/* ===== Department Manager routes ===== */}
        <Route path="/department-manager/dashboard" element={
          <ProtectedRoute requireDepartmentManager>
            <Layout>
              <GeneralManagerDashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/department-manager/approvals" element={
          <ProtectedRoute requireDepartmentManager>
            <Layout>
              <DepartmentManagerApprovals />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/department-manager/team" element={
          <ProtectedRoute requireDepartmentManager>
            <Layout>
              <GeneralManagerTeamView />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/department-manager/balances" element={
          <ProtectedRoute requireDepartmentManager>
            <Layout>
              <CompanyBalances />
            </Layout>
          </ProtectedRoute>
        } />

        {/* ===== Staff routes (accessible by staff and managers) ===== */}
        <Route path="/staff/dashboard" element={
          <ProtectedRoute>
            <Layout>
              <StaffDashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/staff/request" element={
          <ProtectedRoute>
            <Layout>
              <LeaveRequest />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/staff/history" element={
          <ProtectedRoute>
            <Layout>
              <LeaveHistory />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/staff/calendar" element={
          <ProtectedRoute>
            <Layout>
              <CalendarView />
            </Layout>
          </ProtectedRoute>
        } />

        {/* ===== Manager routes ===== */}
        <Route path="/manager/dashboard" element={
          <ProtectedRoute requireManager>
            <Layout>
              <ManagerDashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/manager/approvals" element={
          <ProtectedRoute requireManager>
            <Layout>
              <Approvals />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/manager/team" element={
          <ProtectedRoute requireManager>
            <Layout>
              <TeamView />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/manager/reports" element={
          <ProtectedRoute requireManager>
            <Layout>
              <Reports />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/manager/balances" element={
          <ProtectedRoute requireManager>
            <Layout>
              <TeamBalances />
            </Layout>
          </ProtectedRoute>
        } />

        {/* Profile (all authenticated users) */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <Layout>
              <ProfilePage />
            </Layout>
          </ProtectedRoute>
        } />

        {/* Catch-all: redirect based on role */}
        <Route path="*" element={
          user ? <Navigate to={resolveDefaultRoute(user)} replace /> : <Navigate to="/login" replace />
        } />
      </Routes>
    </Router>
  );
};

// Main App component
const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </ThemeProvider>
    </Provider>
  );
};

export default App;
