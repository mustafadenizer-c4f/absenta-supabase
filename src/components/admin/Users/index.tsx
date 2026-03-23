// src/components/admin/Users/index.tsx - Multi-tenant: company auto-inherited from admin
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { fetchHierarchyProfile } from '../../../store/slices/organizationSlice';
import { supabase } from '../../../config/supabase';
import { OrganizationService } from '../../../services/organization';
import { User, UserRole, Group, Department, Team } from '../../../types';
import Swal from 'sweetalert2';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  Edit,
  Delete,
  Refresh,
  PersonAdd,
  LockReset,
} from '@mui/icons-material';

const ROLE_LABELS: Record<UserRole, string> = {
  staff: 'Staff',
  manager: 'Manager',
  group_manager: 'Group Manager',
  department_manager: 'Department Manager',
  admin: 'Admin',
  supervisor: 'Supervisor',
};

const ROLE_COLORS: Record<UserRole, 'default' | 'primary' | 'secondary' | 'info' | 'warning'> = {
  staff: 'default',
  manager: 'secondary',
  group_manager: 'info',
  department_manager: 'warning',
  admin: 'primary',
  supervisor: 'warning',
};

interface UserFormData {
  email: string;
  full_name: string;
  phone: string;
  hire_date: string;
  role: UserRole;
  group_id: string;
  department_id: string;
  team_id: string;
  manager_id: string;
}

const Users: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const { hierarchyProfile } = useSelector((state: RootState) => state.organization);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [newUserPassword, setNewUserPassword] = useState('Pp123456');

  // Organization data — scoped to admin's company
  const [groups, setGroups] = useState<Group[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    full_name: '',
    phone: '',
    hire_date: new Date().toISOString().split('T')[0],
    role: 'staff',
    group_id: '',
    department_id: '',
    team_id: '',
    manager_id: '',
  });

  useEffect(() => {
    fetchUsers();
    if (currentUser?.company_id) {
      dispatch(fetchHierarchyProfile(currentUser.company_id));
    }
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load org data based on hierarchy profile
  useEffect(() => {
    if (!currentUser?.company_id) return;
    const profile = hierarchyProfile || 'flat';
    if (profile === 'groups') {
      fetchGroups(currentUser.company_id);
    }
    if (profile === 'departments') {
      // departments are top-level in this profile, fetch all
      fetchDepartments();
    }
    if (profile === 'teams') {
      // teams are the only level, fetch all
      fetchTeamsForCompany();
    }
  }, [hierarchyProfile, currentUser?.company_id]);

  // Track whether we're initializing the form (editing existing user) vs user interaction
  const [isInitializing, setIsInitializing] = useState(false);

  // Cascade: when group changes, fetch departments for that group (only in 'groups' profile)
  useEffect(() => {
    if (hp !== 'groups') return;
    if (formData.group_id) {
      fetchDepartments(formData.group_id);
    } else {
      setDepartments([]);
      setTeams([]);
    }
    if (!isInitializing) {
      setFormData((prev) => ({ ...prev, department_id: '', team_id: '', manager_id: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.group_id]);

  // Cascade: when department changes, fetch teams (in 'groups' and 'departments' profiles)
  useEffect(() => {
    if (hp === 'teams' || hp === 'flat') return;
    if (formData.department_id) {
      fetchTeamsForDept(formData.department_id);
    } else {
      setTeams([]);
    }
    if (!isInitializing) {
      setFormData((prev) => ({ ...prev, team_id: '', manager_id: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.department_id]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Scope to admin's company
      let query = supabase
        .from('users')
        .select('*')
        .order('full_name');

      if (currentUser?.company_id) {
        query = query.eq('company_id', currentUser.company_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async (companyId: string) => {
    try {
      const data = await OrganizationService.getGroups(companyId);
      setGroups(data);
    } catch (err: any) {
      console.error('Failed to fetch groups:', err.message);
    }
  };

  const fetchDepartments = async (groupId?: string) => {
    try {
      const data = await OrganizationService.getDepartments(groupId);
      setDepartments(data);
    } catch (err: any) {
      console.error('Failed to fetch departments:', err.message);
    }
  };

  const fetchTeamsForDept = async (departmentId: string) => {
    try {
      const data = await OrganizationService.getTeams(departmentId);
      setTeams(data);
    } catch (err: any) {
      console.error('Failed to fetch teams:', err.message);
    }
  };

  const fetchTeamsForCompany = async () => {
    try {
      const data = await OrganizationService.getTeams();
      setTeams(data);
    } catch (err: any) {
      console.error('Failed to fetch teams:', err.message);
    }
  };

  // Hierarchy profile shorthand — used by visibility helpers and manager filtering
  const hp = hierarchyProfile || 'flat';

  // Determine which role is the "next level up" for the selected role
  const getApproverRoles = (role: UserRole): UserRole[] => {
    switch (role) {
      case 'staff': return ['manager'];
      case 'manager':
        if (hp === 'groups') return ['department_manager'];
        if (hp === 'departments') return ['department_manager'];
        return ['admin'];
      case 'department_manager':
        if (hp === 'groups') return ['group_manager'];
        return ['admin'];
      case 'group_manager': return ['admin'];
      default: return [];
    }
  };

  // Whether the selected role needs a manager assignment
  const needsManager = (role: UserRole) => role !== 'admin' && role !== 'supervisor';

  // Filter potential managers: users with the approver role, scoped to org level
  const getFilteredManagers = () => {
    const approverRoles = getApproverRoles(formData.role);
    if (approverRoles.length === 0) return [];
    let candidates = users.filter((u) => approverRoles.includes(u.role));
    // Scope by org level
    if (formData.team_id) {
      candidates = candidates.filter((m) => m.team_id === formData.team_id);
    }
    if ((hp === 'groups' || hp === 'departments') && formData.department_id) {
      candidates = candidates.filter((m) => m.department_id === formData.department_id);
    }
    if (hp === 'groups' && formData.group_id) {
      candidates = candidates.filter((m) => m.group_id === formData.group_id);
    }
    // For roles whose approver is admin, don't filter by org — admins are company-wide
    if (approverRoles.includes('admin')) {
      candidates = users.filter((u) => u.role === 'admin');
    }
    return candidates;
  };
  const filteredManagers = getFilteredManagers();

  const handleOpenDialog = async (user?: User) => {
    if (user) {
      setIsInitializing(true);
      setEditingUser(user);

      // Pre-load org data based on hierarchy profile
      if (hp === 'groups' && currentUser?.company_id) {
        await fetchGroups(currentUser.company_id);
        if (user.group_id) await fetchDepartments(user.group_id);
        if (user.department_id) await fetchTeamsForDept(user.department_id);
      } else if (hp === 'departments') {
        await fetchDepartments();
        if (user.department_id) await fetchTeamsForDept(user.department_id);
      } else if (hp === 'teams') {
        await fetchTeamsForCompany();
      }

      setFormData({
        email: user.email,
        full_name: user.full_name,
        phone: user.phone || '',
        hire_date: user.hire_date,
        role: user.role || 'staff',
        group_id: user.group_id || '',
        department_id: user.department_id || '',
        team_id: user.team_id || '',
        manager_id: user.manager_id || '',
      });

      setOpenDialog(true);
      setTimeout(() => setIsInitializing(false), 0);
    } else {
      // New user — open create dialog
      setEditingUser(null);
      // Pre-load org data based on hierarchy profile
      if (hp === 'groups' && currentUser?.company_id) {
        await fetchGroups(currentUser.company_id);
      } else if (hp === 'departments') {
        await fetchDepartments();
      } else if (hp === 'teams') {
        await fetchTeamsForCompany();
      }
      setFormData({
        email: '',
        full_name: '',
        phone: '',
        hire_date: new Date().toISOString().split('T')[0],
        role: 'staff',
        group_id: '',
        department_id: '',
        team_id: '',
        manager_id: '',
      });
      setNewUserPassword('Pp123456');
      setOpenDialog(true);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setDepartments([]);
    setTeams([]);
  };

  const handleGroupChange = (groupId: string) => {
    setIsInitializing(false);
    setFormData((prev) => ({
      ...prev,
      group_id: groupId,
      department_id: '',
      team_id: '',
      manager_id: '',
    }));
  };

  // Hierarchy-aware visibility helpers
  // groups = all levels, departments = depts+teams, teams = only teams
  const needsGroup = (role: UserRole) =>
    hp === 'groups' && ['group_manager', 'department_manager', 'manager', 'staff'].includes(role);
  const needsDepartment = (role: UserRole) =>
    (hp === 'groups' || hp === 'departments') && ['department_manager', 'manager', 'staff'].includes(role);
  const needsTeam = (role: UserRole) =>
    hp !== 'flat' && ['manager', 'staff'].includes(role);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required org fields
    if (needsGroup(formData.role) && !formData.group_id) {
      setError('Please select a group.'); return;
    }
    if (needsDepartment(formData.role) && !formData.department_id) {
      setError('Please select a department.'); return;
    }
    if (needsTeam(formData.role) && !formData.team_id) {
      setError('Please select a team.'); return;
    }
    if (needsManager(formData.role) && !formData.manager_id) {
      setError('Please select an assigned manager.'); return;
    }

    try {
      if (editingUser) {
        // ── Update existing user ──
        const updateData: Record<string, any> = {
          full_name: formData.full_name,
          phone: formData.phone || null,
          hire_date: formData.hire_date,
          role: formData.role,
          company_id: currentUser?.company_id || null,
          group_id: needsGroup(formData.role) ? (formData.group_id || null) : null,
          department_id: needsDepartment(formData.role) ? (formData.department_id || null) : null,
          team_id: needsTeam(formData.role) ? (formData.team_id || null) : null,
          manager_id: needsManager(formData.role) ? (formData.manager_id || null) : null,
        };

        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', editingUser.id);

        if (error) throw error;

        Swal.fire({ icon: 'success', title: 'User updated', text: 'User profile has been updated successfully.', timer: 2000, showConfirmButton: false });
      } else {
        // ── Create new user ──
        // 1. Save current admin session
        const { data: { session: adminSession } } = await supabase.auth.getSession();

        // 2. Create auth account via signUp (trigger creates public.users row)
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: newUserPassword,
          options: {
            data: { full_name: formData.full_name },
          },
        });

        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error('Failed to create auth account');

        // 3. Update the auto-created profile with role, company, org fields
        const newUserId = signUpData.user.id;

        // 4. Restore admin session immediately
        if (adminSession) {
          await supabase.auth.setSession({
            access_token: adminSession.access_token,
            refresh_token: adminSession.refresh_token,
          });
        }

        // 5. Now update the new user's profile as admin
        const updateData: Record<string, any> = {
          full_name: formData.full_name,
          phone: formData.phone || null,
          hire_date: formData.hire_date,
          role: formData.role,
          company_id: currentUser?.company_id || null,
          group_id: needsGroup(formData.role) ? (formData.group_id || null) : null,
          department_id: needsDepartment(formData.role) ? (formData.department_id || null) : null,
          team_id: needsTeam(formData.role) ? (formData.team_id || null) : null,
          manager_id: needsManager(formData.role) ? (formData.manager_id || null) : null,
          requires_password_change: true,
        };

        const { error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', newUserId);

        if (updateError) throw updateError;

        Swal.fire({ icon: 'success', title: 'User created', text: 'New user has been created successfully.', timer: 2000, showConfirmButton: false });
      }

      handleCloseDialog();
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (userId: string, userEmail: string) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete user?',
      html: `Are you sure you want to delete <strong>${userEmail}</strong>?<br><br><small>This only removes their profile. You must also delete their auth account in Supabase.</small>`,
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete',
    });
    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);

        if (error) throw error;
        fetchUsers();
        Swal.fire({ icon: 'success', title: 'Deleted', text: 'Profile deleted. Remember to delete auth account in Supabase.', timer: 2500, showConfirmButton: false });
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const handleResetPassword = async (userId: string, userEmail: string) => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Reset password?',
      html: `Reset password for <strong>${userEmail}</strong> to default (Pp123456)?<br><br><small>The user will be required to change it on next login.</small>`,
      showCancelButton: true,
      confirmButtonText: 'Reset',
    });
    if (result.isConfirmed) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No active session');

        const response = await fetch(
          `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/reset-password`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY || '',
            },
            body: JSON.stringify({ user_id: userId }),
          }
        );

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to reset password');

        fetchUsers();
        Swal.fire({ icon: 'success', title: 'Password reset', text: 'Password reset to Pp123456. User will be prompted to change it on next login.', timer: 2500, showConfirmButton: false });
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const getRoleLabel = (user: User): string => {
    return ROLE_LABELS[user.role] || user.role;
  };

  const getRoleColor = (user: User) => {
    return ROLE_COLORS[user.role] || 'default';
  };

  const stats = {
    totalUsers: users.length,
    incompleteProfiles: users.filter(u => !u.full_name || u.full_name === u.email.split('@')[0]).length,
    pendingPasswordReset: users.filter(u => u.requires_password_change).length,
    admins: users.filter(u => u.role === 'admin').length,
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 600 }}>
          User Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchUsers}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => handleOpenDialog()}
          >
            Add New User
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>Total Users</Typography>
            <Typography variant="h4" color="primary">
              {stats.totalUsers}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>Admins</Typography>
            <Typography variant="h4" color="secondary">
              {stats.admins}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>Pending Reset</Typography>
            <Typography variant="h4" color="warning.main">
              {stats.pendingPasswordReset}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>Incomplete</Typography>
            <Typography variant="h4" color="error.main">
              {stats.incompleteProfiles}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Users Table */}
      <Paper sx={{ mb: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>User</strong></TableCell>
                <TableCell><strong>Contact</strong></TableCell>
                <TableCell><strong>Role</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Hire Date</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                        }}
                      >
                        {user.full_name?.charAt(0).toUpperCase() || 'U'}
                      </Box>
                      <Box>
                        <Typography fontWeight="medium">
                          {user.full_name || 'Unnamed User'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          ID: {user.id.substring(0, 8)}...
                        </Typography>
                        {(!user.full_name || user.full_name === user.email.split('@')[0]) && (
                          <Chip
                            label="Incomplete"
                            size="small"
                            color="warning"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography>{user.email}</Typography>
                    {user.phone && (
                      <Typography variant="body2" color="textSecondary">
                        📱 {user.phone}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getRoleLabel(user)}
                      color={getRoleColor(user)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.requires_password_change ? 'Reset Required' : 'Active'}
                      color={user.requires_password_change ? 'warning' : 'success'}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(user.hire_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(user)}
                        color="primary"
                        title="Edit user"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleResetPassword(user.id, user.email)}
                        color="warning"
                        title="Reset password"
                      >
                        <LockReset />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(user.id, user.email)}
                        color="error"
                        title="Delete user"
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create/Edit User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Edit User Profile' : 'Create New User'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {!editingUser && (
              <>
                <TextField
                  autoFocus
                  margin="dense"
                  label="Email Address"
                  type="email"
                  fullWidth
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  margin="dense"
                  label="Password"
                  type="text"
                  fullWidth
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  sx={{ mb: 2 }}
                  helperText="Default: Pp123456 — user will be asked to change on first login"
                />
              </>
            )}

            <TextField
              autoFocus={!!editingUser}
              margin="dense"
              label="Full Name"
              type="text"
              fullWidth
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              sx={{ mb: 2 }}
            />

            {editingUser && (
              <TextField
                margin="dense"
                label="Email Address"
                type="email"
                fullWidth
                disabled
                value={formData.email}
                sx={{ mb: 2 }}
                helperText="Email cannot be changed"
              />
            )}

            <TextField
              margin="dense"
              label="Phone Number"
              type="tel"
              fullWidth
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              sx={{ mb: 2 }}
            />

            <TextField
              margin="dense"
              label="Hire Date"
              type="date"
              fullWidth
              required
              value={formData.hire_date}
              onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 3 }}
            />

            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
              Role &amp; Organization
            </Typography>

            {/* Role Select - filtered by hierarchy */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) => {
                  const newRole = e.target.value as UserRole;
                  setFormData((prev) => ({
                    ...prev,
                    role: newRole,
                    // Clear fields not needed for the new role
                    group_id: needsGroup(newRole) ? prev.group_id : '',
                    department_id: needsDepartment(newRole) ? prev.department_id : '',
                    team_id: needsTeam(newRole) ? prev.team_id : '',
                    manager_id: newRole !== 'admin' && newRole !== 'supervisor' ? '' : '',
                  }));
                }}
                required
              >
                <MenuItem value="staff">Staff</MenuItem>
                {hp !== 'flat' && <MenuItem value="manager">Manager</MenuItem>}
                {(hp === 'departments' || hp === 'groups') && <MenuItem value="department_manager">Department Manager</MenuItem>}
                {hp === 'groups' && <MenuItem value="group_manager">Group Manager</MenuItem>}
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>

            {/* Group Dropdown - shown for group_manager, department_manager, manager, staff */}
            {needsGroup(formData.role) && (
              <FormControl fullWidth sx={{ mb: 2 }} required>
                <InputLabel>Group *</InputLabel>
                <Select
                  value={formData.group_id}
                  label="Group *"
                  onChange={(e) => handleGroupChange(e.target.value as string)}
                  required
                >
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Department Dropdown - shown for department_manager, manager, staff when hierarchy includes departments */}
            {needsDepartment(formData.role) && (
              <FormControl fullWidth sx={{ mb: 2 }} disabled={hp === 'groups' && !formData.group_id} required>
                <InputLabel>Department *</InputLabel>
                <Select
                  value={formData.department_id}
                  label="Department *"
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value as string })}
                  required
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Team Dropdown - shown for manager, staff */}
            {needsTeam(formData.role) && (
              <FormControl fullWidth sx={{ mb: 2 }} disabled={(hp === 'groups' || hp === 'departments') && !formData.department_id} required>
                <InputLabel>Team *</InputLabel>
                <Select
                  value={formData.team_id}
                  label="Team *"
                  onChange={(e) => setFormData({ ...formData, team_id: e.target.value as string })}
                  required
                >
                  {teams.map((team) => (
                    <MenuItem key={team.id} value={team.id}>
                      {team.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Manager Dropdown - shown for all non-admin roles */}
            {needsManager(formData.role) && (
              <FormControl fullWidth sx={{ mb: 2 }} required>
                <InputLabel>Assigned Manager *</InputLabel>
                <Select
                  value={formData.manager_id}
                  label="Assigned Manager *"
                  onChange={(e) => setFormData({ ...formData, manager_id: e.target.value as string })}
                  required
                >
                  {filteredManagers
                    .filter((m) => m.id !== editingUser?.id)
                    .map((manager) => (
                      <MenuItem key={manager.id} value={manager.id}>
                        {manager.full_name || manager.email}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingUser ? 'Update Profile' : 'Create User'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Add User Instructions Dialog */}
      <Dialog open={showInstructions} onClose={() => setShowInstructions(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PersonAdd color="primary" />
            <Typography variant="h6">How to Add a New User</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              User creation requires two steps due to security restrictions.
            </Alert>

            <Typography variant="h6" sx={{ mt: 3, mb: 2, color: 'primary.main' }}>
              Step 1: Create Auth Account in Supabase
            </Typography>

            <Box sx={{ pl: 2 }}>
              <Typography variant="body1" sx={{ mb: 1 }}>
                1. Go to <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" style={{ color: '#818CF8' }}>Supabase Dashboard</a>
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                2. Select your project
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                3. Go to <strong>Authentication → Users</strong>
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                4. Click <strong>"Add User"</strong>
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                5. Enter:
              </Typography>
              <Box sx={{ pl: 3, mb: 2 }}>
                <Typography variant="body2">• Email: user@example.com</Typography>
                <Typography variant="body2">• Password: <code>Pp123456</code> (default)</Typography>
              </Box>
              <Typography variant="body1">
                6. Click <strong>"Invite User"</strong>
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" sx={{ mt: 3, mb: 2, color: 'primary.main' }}>
              Step 2: Complete Profile in This App
            </Typography>

            <Box sx={{ pl: 2 }}>
              <Typography variant="body1" sx={{ mb: 1 }}>
                1. Ask the user to log in once with their credentials
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                2. Their profile will be created automatically
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                3. Come back to this page and <strong>refresh</strong> the list
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                4. Click <strong>"Edit"</strong> on the new user to set:
              </Typography>
              <Box sx={{ pl: 3 }}>
                <Typography variant="body2">• Full name</Typography>
                <Typography variant="body2">• Phone number</Typography>
                <Typography variant="body2">• Hire date</Typography>
                <Typography variant="body2">• Role (Staff/Manager/Group Manager/General Manager/Admin)</Typography>
                <Typography variant="body2">• Company, Group, and Department</Typography>
                <Typography variant="body2">• Assigned Manager (for all non-admin users)</Typography>
              </Box>
            </Box>

            <Alert severity="success" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Tip:</strong> Users can self-register too! They just need to:
                <ol>
                  <li>Go to the login page</li>
                  <li>Click "Sign up" (if available)</li>
                  <li>Use their email and set a password</li>
                  <li>Their profile will auto-create with default settings</li>
                </ol>
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInstructions(false)} variant="contained">
            Got it!
          </Button>
        </DialogActions>
      </Dialog>

      {/* Footer Actions */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" color="textSecondary">
              Need Help?
            </Typography>
            <Button
              variant="text"
              onClick={() => window.open('https://supabase.com/docs/guides/auth', '_blank')}
              size="small"
            >
              View Supabase Auth Docs
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={fetchUsers}
              startIcon={<Refresh />}
            >
              Refresh List
            </Button>
            <Button
              variant="contained"
              onClick={() => setShowInstructions(true)}
              startIcon={<PersonAdd />}
            >
              Add User Instructions
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Users;
