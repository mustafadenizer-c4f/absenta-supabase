// src/components/admin/Holidays/index.tsx
import React, { useState, useEffect } from 'react';
import { HolidaysService } from '../../../services/holidays';
import { Holiday } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
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
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  Event,
} from '@mui/icons-material';

const Holidays: React.FC = () => {
  const { user } = useAuth();
  const companyId = user?.company_id;
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingHoliday, setDeletingHoliday] = useState<Holiday | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    holiday_date: '',
    holiday_end_date: '',
    description: '',
    is_recurring: false,
  });

  useEffect(() => {
    fetchHolidays();
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await HolidaysService.getAll(companyId);
      setHolidays(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (holiday?: Holiday) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        name: holiday.name,
        holiday_date: holiday.holiday_date,
        holiday_end_date: holiday.holiday_end_date || holiday.holiday_date,
        description: holiday.description || '',
        is_recurring: holiday.is_recurring,
      });
    } else {
      setEditingHoliday(null);
      setFormData({
        name: '',
        holiday_date: '',
        holiday_end_date: '',
        description: '',
        is_recurring: false,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingHoliday(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endDate = formData.holiday_end_date || formData.holiday_date;
      const payload = {
        name: formData.name,
        holiday_date: formData.holiday_date,
        holiday_end_date: endDate,
        description: formData.description || null,
        is_recurring: formData.is_recurring,
        company_id: companyId,
      };

      if (editingHoliday) {
        await HolidaysService.update(editingHoliday.id, payload);
      } else {
        await HolidaysService.create(payload);
      }

      handleCloseDialog();
      fetchHolidays();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteClick = (holiday: Holiday) => {
    setDeletingHoliday(holiday);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingHoliday) return;
    try {
      await HolidaysService.delete(deletingHoliday.id);
      setDeleteConfirmOpen(false);
      setDeletingHoliday(null);
      fetchHolidays();
    } catch (err: any) {
      setError(err.message);
      setDeleteConfirmOpen(false);
      setDeletingHoliday(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setDeletingHoliday(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
          Holidays Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchHolidays}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Holiday
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Holidays Table */}
      <Paper sx={{ mb: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Description</strong></TableCell>
                <TableCell><strong>Recurring</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {holidays.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Box sx={{ py: 4 }}>
                      <Event sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography color="text.secondary">
                        No holidays configured yet. Click "Add Holiday" to get started.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                holidays.map((holiday) => (
                  <TableRow key={holiday.id} hover>
                    <TableCell>
                      <Typography fontWeight="medium">
                        {formatDate(holiday.holiday_date)}
                        {holiday.holiday_end_date && holiday.holiday_end_date !== holiday.holiday_date
                          ? ` — ${formatDate(holiday.holiday_end_date)}`
                          : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight="medium">{holiday.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {holiday.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={holiday.is_recurring ? 'Recurring' : 'One-time'}
                        color={holiday.is_recurring ? 'primary' : 'default'}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(holiday)}
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(holiday)}
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

      {/* Stats */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" color="textSecondary">
              Total Holidays
            </Typography>
            <Typography variant="h4" color="primary">
              {holidays.length}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="textSecondary">
              Recurring
            </Typography>
            <Typography variant="h4" color="success.main">
              {holidays.filter(h => h.is_recurring).length}
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={fetchHolidays}
            startIcon={<Refresh />}
          >
            Refresh List
          </Button>
        </Box>
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Holiday Name"
              type="text"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              sx={{ mb: 2 }}
            />

            <TextField
              margin="dense"
              label="Start Date"
              type="date"
              fullWidth
              required
              slotProps={{ inputLabel: { shrink: true } }}
              value={formData.holiday_date}
              onChange={(e) => setFormData({ ...formData, holiday_date: e.target.value })}
              sx={{ mb: 2 }}
            />

            <TextField
              margin="dense"
              label="End Date"
              type="date"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={formData.holiday_end_date}
              onChange={(e) => setFormData({ ...formData, holiday_end_date: e.target.value })}
              helperText="Leave empty for a single-day holiday"
              sx={{ mb: 2 }}
            />

            <TextField
              margin="dense"
              label="Description"
              type="text"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                />
              }
              label="Recurring annually"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingHoliday ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the holiday "{deletingHoliday?.name}"
            ({deletingHoliday ? formatDate(deletingHoliday.holiday_date) : ''})?
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

export default Holidays;
