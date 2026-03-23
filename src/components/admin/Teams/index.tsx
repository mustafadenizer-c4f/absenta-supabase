// src/components/admin/Teams/index.tsx
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import {
  fetchGroups,
  fetchDepartments,
  fetchTeams,
  fetchHierarchyProfile,
  createTeam,
  updateTeam,
  deleteTeam,
  clearOrganizationError,
} from '../../../store/slices/organizationSlice';
import { Team } from '../../../types';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, CircularProgress,
  Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { Add, Edit, Delete, Refresh, Groups } from '@mui/icons-material';

const Teams: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { departments, teams, groups, loading, hierarchyProfile } = useSelector((state: RootState) => state.organization);
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const hp = hierarchyProfile || 'flat';
  const showDeptColumn = hp === 'groups' || hp === 'departments';
  const showGroupColumn = hp === 'groups';

  const [error, setError] = useState<string | null>(null);
  const [filterDeptId, setFilterDeptId] = useState('');
  const [filterGroupId, setFilterGroupId] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [dialogGroupId, setDialogGroupId] = useState('');

  // Departments filtered by selected group in the dialog
  const dialogDepartments = dialogGroupId
    ? departments.filter((d) => d.group_id === dialogGroupId)
    : departments;

  useEffect(() => {
    if (currentUser?.company_id) {
      dispatch(fetchGroups(currentUser.company_id));
      dispatch(fetchHierarchyProfile(currentUser.company_id));
    }
    dispatch(fetchDepartments(undefined));
    dispatch(fetchTeams(undefined));
  }, [dispatch, currentUser]);

  const filteredTeams = filterDeptId
    ? teams.filter((t) => t.department_id === filterDeptId)
    : teams;

  const getDeptName = (deptId: string) =>
    departments.find((d) => d.id === deptId)?.name || 'Unknown';

  const getGroupName = (deptId: string) => {
    const dept = departments.find((d) => d.id === deptId);
    if (!dept) return '';
    return groups.find((g) => g.id === dept.group_id)?.name || '';
  };

  const handleOpenDialog = (team?: Team) => {
    if (team) {
      setEditingTeam(team);
      setName(team.name);
      setDepartmentId(team.department_id || '');
      // Find the group for this team's department
      const dept = departments.find((d) => d.id === team.department_id);
      setDialogGroupId(dept?.group_id || '');
    } else {
      setEditingTeam(null);
      setName('');
      setDepartmentId(filterDeptId || '');
      setDialogGroupId('');
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTeam(null);
    setName('');
    setDepartmentId('');
    setDialogGroupId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTeam) {
        await dispatch(updateTeam({ id: editingTeam.id, name })).unwrap();
      } else {
        await dispatch(createTeam({ name, departmentId: departmentId || undefined, companyId: currentUser?.company_id })).unwrap();
      }
      handleCloseDialog();
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'An error occurred');
    }
  };

  const handleDeleteClick = (team: Team) => {
    setDeletingTeam(team);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTeam) return;
    try {
      await dispatch(deleteTeam(deletingTeam.id)).unwrap();
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'An error occurred');
    }
    setDeleteConfirmOpen(false);
    setDeletingTeam(null);
  };

  const handleRefresh = () => {
    setError(null);
    dispatch(clearOrganizationError());
    if (currentUser?.company_id) dispatch(fetchGroups(currentUser.company_id));
    dispatch(fetchDepartments(undefined));
    dispatch(fetchTeams(undefined));
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  if (loading && teams.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 600 }}>
          Teams Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={handleRefresh}>Refresh</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>Add Team</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {showDeptColumn && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 250 }}>
            <InputLabel>Filter by Department</InputLabel>
            <Select value={filterDeptId} label="Filter by Department" onChange={(e) => setFilterDeptId(e.target.value)}>
              <MenuItem value="">All Departments</MenuItem>
              {departments.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Paper>
      )}

      <Paper sx={{ mb: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Name</strong></TableCell>
                {showGroupColumn && <TableCell><strong>Group</strong></TableCell>}
                {showDeptColumn && <TableCell><strong>Department</strong></TableCell>}
                <TableCell><strong>Created At</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTeams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2 + (showGroupColumn ? 1 : 0) + (showDeptColumn ? 1 : 0)} align="center">
                    <Box sx={{ py: 4 }}>
                      <Groups sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography color="text.secondary">No teams yet. Click "Add Team" to get started.</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeams.map((team) => (
                  <TableRow key={team.id} hover>
                    <TableCell><Typography fontWeight="medium">{team.name}</Typography></TableCell>
                    {showGroupColumn && <TableCell>{getGroupName(team.department_id)}</TableCell>}
                    {showDeptColumn && <TableCell>{getDeptName(team.department_id)}</TableCell>}
                    <TableCell>{formatDate(team.created_at)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton size="small" onClick={() => handleOpenDialog(team)} color="primary"><Edit /></IconButton>
                        <IconButton size="small" onClick={() => handleDeleteClick(team)} color="error"><Delete /></IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTeam ? 'Edit Team' : 'Add New Team'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField autoFocus margin="dense" label="Team Name" fullWidth required value={name} onChange={(e) => setName(e.target.value)} />
            {showGroupColumn && (
              <FormControl fullWidth margin="dense" required disabled={!!editingTeam}>
                <InputLabel>Group</InputLabel>
                <Select value={dialogGroupId} label="Group" onChange={(e) => {
                  setDialogGroupId(e.target.value);
                  setDepartmentId(''); // reset department when group changes
                }}>
                  {groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            {showDeptColumn && (
              <FormControl fullWidth margin="dense" required disabled={!!editingTeam || (showGroupColumn && !dialogGroupId)}>
                <InputLabel>Department</InputLabel>
                <Select value={departmentId} label="Department" onChange={(e) => setDepartmentId(e.target.value)}>
                  {dialogDepartments.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                </Select>
              </FormControl>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={!name || (showDeptColumn && !departmentId)}>{editingTeam ? 'Update' : 'Create'}</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => { setDeleteConfirmOpen(false); setDeletingTeam(null); }}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete the team "{deletingTeam?.name}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteConfirmOpen(false); setDeletingTeam(null); }}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Teams;
