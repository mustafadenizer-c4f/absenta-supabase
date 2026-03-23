// src/components/admin/Departments/index.tsx
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import {
  fetchGroups,
  fetchDepartments,
  fetchHierarchyProfile,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  clearOrganizationError,
} from '../../../store/slices/organizationSlice';
import { Department } from '../../../types';
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
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  Business,
} from '@mui/icons-material';

const Departments: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { groups, departments, loading, hierarchyProfile } = useSelector((state: RootState) => state.organization);
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const hp = hierarchyProfile || 'flat';
  const showGroupColumn = hp === 'groups';

  const [error, setError] = useState<string | null>(null);
  const [filterGroupId, setFilterGroupId] = useState<string>('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState('');

  useEffect(() => {
    if (currentUser?.company_id) {
      dispatch(fetchGroups(currentUser.company_id));
      dispatch(fetchHierarchyProfile(currentUser.company_id));
    }
    dispatch(fetchDepartments(undefined));
  }, [dispatch, currentUser]);

  const filteredDepartments = filterGroupId
    ? departments.filter((d) => d.group_id === filterGroupId)
    : departments;

  const getGroupName = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    return group ? group.name : 'Unknown';
  };

  const handleOpenDialog = (department?: Department) => {
    if (department) {
      setEditingDepartment(department);
      setName(department.name);
      setGroupId(department.group_id);
    } else {
      setEditingDepartment(null);
      setName('');
      setGroupId(filterGroupId || '');
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDepartment(null);
    setName('');
    setGroupId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDepartment) {
        await dispatch(updateDepartment({ id: editingDepartment.id, name })).unwrap();
      } else {
        await dispatch(createDepartment({ name, groupId: groupId || undefined, companyId: currentUser?.company_id })).unwrap();
      }
      handleCloseDialog();
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'An error occurred');
    }
  };

  const handleDeleteClick = (department: Department) => {
    setDeletingDepartment(department);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDepartment) return;
    try {
      await dispatch(deleteDepartment(deletingDepartment.id)).unwrap();
      setDeleteConfirmOpen(false);
      setDeletingDepartment(null);
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'An error occurred');
      setDeleteConfirmOpen(false);
      setDeletingDepartment(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setDeletingDepartment(null);
  };

  const handleRefresh = () => {
    setError(null);
    dispatch(clearOrganizationError());
    if (currentUser?.company_id) {
      dispatch(fetchGroups(currentUser.company_id));
    }
    dispatch(fetchDepartments(undefined));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading && departments.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 600 }}>
          Departments Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={handleRefresh}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
            Add Department
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Group Filter */}
      {showGroupColumn && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 250 }}>
            <InputLabel>Filter by Group</InputLabel>
            <Select
              value={filterGroupId}
              label="Filter by Group"
              onChange={(e) => setFilterGroupId(e.target.value)}
            >
              <MenuItem value="">All Groups</MenuItem>
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>
      )}

      {/* Departments Table */}
      <Paper sx={{ mb: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Name</strong></TableCell>
                {showGroupColumn && <TableCell><strong>Group</strong></TableCell>}
                <TableCell><strong>Created At</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDepartments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showGroupColumn ? 4 : 3} align="center">
                    <Box sx={{ py: 4 }}>
                      <Business sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography color="text.secondary">
                        No departments configured yet. Click "Add Department" to get started.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDepartments.map((department) => (
                  <TableRow key={department.id} hover>
                    <TableCell>
                      <Typography fontWeight="medium">{department.name}</Typography>
                    </TableCell>
                    {showGroupColumn && <TableCell>{getGroupName(department.group_id)}</TableCell>}
                    <TableCell>{formatDate(department.created_at)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(department)}
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(department)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingDepartment ? 'Edit Department' : 'Add New Department'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Department Name"
              type="text"
              fullWidth
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {showGroupColumn && (
              <FormControl fullWidth margin="dense" required disabled={!!editingDepartment}>
                <InputLabel>Group</InputLabel>
                <Select
                  value={groupId}
                  label="Group"
                  onChange={(e) => setGroupId(e.target.value)}
                >
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={!name || (showGroupColumn && !groupId)}>
              {editingDepartment ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the department "{deletingDepartment?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Departments;
