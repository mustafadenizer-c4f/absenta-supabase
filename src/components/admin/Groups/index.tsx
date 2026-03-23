// src/components/admin/Groups/index.tsx
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import {
  fetchGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  clearOrganizationError,
} from '../../../store/slices/organizationSlice';
import { Group } from '../../../types';
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
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  GroupWork,
} from '@mui/icons-material';

const Groups: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { groups, loading } = useSelector((state: RootState) => state.organization);
  const { user: currentUser } = useSelector((state: RootState) => state.auth);

  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    if (currentUser?.company_id) {
      dispatch(fetchGroups(currentUser.company_id));
    }
  }, [dispatch, currentUser]);

  const handleOpenDialog = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setName(group.name);
    } else {
      setEditingGroup(null);
      setName('');
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingGroup(null);
    setName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGroup) {
        await dispatch(updateGroup({ id: editingGroup.id, name })).unwrap();
      } else {
        if (!currentUser?.company_id) {
          setError('No company assigned to your account');
          return;
        }
        await dispatch(createGroup({ name, companyId: currentUser.company_id })).unwrap();
      }
      handleCloseDialog();
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'An error occurred');
    }
  };

  const handleDeleteClick = (group: Group) => {
    setDeletingGroup(group);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingGroup) return;
    try {
      await dispatch(deleteGroup(deletingGroup.id)).unwrap();
      setDeleteConfirmOpen(false);
      setDeletingGroup(null);
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'An error occurred');
      setDeleteConfirmOpen(false);
      setDeletingGroup(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setDeletingGroup(null);
  };

  const handleRefresh = () => {
    setError(null);
    dispatch(clearOrganizationError());
    if (currentUser?.company_id) {
      dispatch(fetchGroups(currentUser.company_id));
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading && groups.length === 0) {
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
          Groups Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={handleRefresh}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
            Add Group
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Groups Table */}
      <Paper sx={{ mb: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Created At</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Box sx={{ py: 4 }}>
                      <GroupWork sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography color="text.secondary">
                        No groups configured yet. Click "Add Group" to get started.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((group) => (
                  <TableRow key={group.id} hover>
                    <TableCell>
                      <Typography fontWeight="medium">{group.name}</Typography>
                    </TableCell>
                    <TableCell>{formatDate(group.created_at)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(group)}
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(group)}
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
        <DialogTitle>{editingGroup ? 'Edit Group' : 'Add New Group'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Group Name"
              type="text"
              fullWidth
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={!name}>
              {editingGroup ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the group "{deletingGroup?.name}"?
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

export default Groups;
