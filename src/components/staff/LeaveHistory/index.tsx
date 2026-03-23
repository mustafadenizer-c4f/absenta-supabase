// src/components/staff/LeaveHistory/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import { Cancel as CancelIcon, FilterList as FilterListIcon } from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { cancelLeaveRequest, fetchHolidays } from '../../../store/slices/leaveSlice';
import { LeaveService, LeaveRequestFilters } from '../../../services/leave';
import { supabase } from '../../../config/supabase';
import { LeaveRequest, LeaveType } from '../../../types';

const statusColorMap: Record<LeaveRequest['status'], 'warning' | 'success' | 'error' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'default',
};

type SortField = 'date' | 'status';
type SortDirection = 'asc' | 'desc';

const MANAGER_ROLES = ['manager', 'group_manager', 'department_manager'];

const LeaveHistory: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const isManager = user ? MANAGER_ROLES.includes(user.role) : false;

  // Data state
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; full_name: string; team_id?: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Cancel dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  // Fetch leave types and team members on mount
  useEffect(() => {
    const fetchLeaveTypes = async () => {
      let query = supabase.from('leave_types').select('*').eq('is_active', true).order('name');
      if (user?.company_id) query = query.eq('company_id', user.company_id);
      const { data } = await query;
      setLeaveTypes(data || []);
    };
    const fetchTeam = async () => {
      if (!user || !isManager) return;
      let query = supabase.from('users').select('id, full_name, team_id').order('full_name');
      if (user.role === 'department_manager' && user.department_id) {
        query = query.eq('department_id', user.department_id).neq('id', user.id);
        // Also fetch teams for this department
        const { data: teamData } = await supabase
          .from('teams')
          .select('id, name')
          .eq('department_id', user.department_id)
          .order('name');
        setTeams(teamData || []);
      } else if (user.role === 'group_manager' && user.group_id) {
        query = query.eq('group_id', user.group_id).neq('id', user.id);
      } else {
        query = query.eq('manager_id', user.id);
      }
      const { data } = await query;
      setTeamMembers(data || []);
    };
    fetchLeaveTypes();
    fetchTeam();
    dispatch(fetchHolidays(user?.company_id));
  }, [dispatch, user?.company_id, user?.id, isManager]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch leave requests
  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const filters: LeaveRequestFilters = { page, pageSize: rowsPerPage };
      if (statusFilter) filters.status = statusFilter;
      if (leaveTypeFilter) filters.leaveTypeId = leaveTypeFilter;
      if (startDateFilter) filters.startDate = startDateFilter;
      if (endDateFilter) filters.endDate = endDateFilter;

      let result: { data: LeaveRequest[]; count: number };

      if (isManager && teamMembers.length > 0) {
        // Determine which team members to include based on team filter
        const filteredMembers = teamFilter
          ? teamMembers.filter((m) => m.team_id === teamFilter)
          : teamMembers;

        // Determine user IDs to query
        let queryUserIds: string[];
        if (userFilter === 'team_only') {
          // "Only Team" — team members only, exclude manager
          queryUserIds = filteredMembers.map((m) => m.id);
        } else if (userFilter && userFilter !== user.id) {
          // Specific team member selected
          queryUserIds = [userFilter];
        } else if (userFilter === user.id) {
          // "Me" selected — only manager's own
          queryUserIds = [user.id];
        } else if (teamFilter) {
          // Team selected, no employee filter — show only that team's members (not me)
          queryUserIds = filteredMembers.map((m) => m.id);
        } else {
          // Default (no team, no employee filter): me + all team
          queryUserIds = [user.id, ...filteredMembers.map((m) => m.id)];
        }

        if (queryUserIds.length === 0) {
          result = { data: [], count: 0 };
        } else if (queryUserIds.length === 1) {
          result = await LeaveService.getRequestsByUser(queryUserIds[0], filters);
        } else {
          result = await LeaveService.getRequestsByUsers(queryUserIds, filters);
        }
      } else {
        result = await LeaveService.getRequestsByUser(user.id, filters);
      }

      let data = result.data as LeaveRequest[];
      data = [...data].sort((a, b) => {
        if (sortField === 'date') {
          return sortDirection === 'asc'
            ? new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
            : new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
        }
        return sortDirection === 'asc' ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
      });

      setRequests(data);
      setTotalCount(result.count);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to load leave history', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [user, isManager, teamMembers, page, rowsPerPage, statusFilter, leaveTypeFilter, startDateFilter, endDateFilter, userFilter, teamFilter, sortField, sortDirection]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handlePageChange = (_: unknown, newPage: number) => setPage(newPage);
  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };
  const handleSortChange = (field: SortField) => {
    if (sortField === field) setSortDirection((p) => (p === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDirection('asc'); }
  };
  const handleClearFilters = () => { setStatusFilter(''); setLeaveTypeFilter(''); setStartDateFilter(''); setEndDateFilter(''); setUserFilter(''); setTeamFilter(''); setPage(0); };
  const handleCancelClick = (request: LeaveRequest) => { setCancelTarget(request); setCancelDialogOpen(true); };
  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await dispatch(cancelLeaveRequest(cancelTarget.id)).unwrap();
      setSnackbar({ open: true, message: 'Leave request cancelled successfully.', severity: 'success' });
      setCancelDialogOpen(false); setCancelTarget(null); fetchRequests();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to cancel request', severity: 'error' });
    } finally { setCancelling(false); }
  };
  const handleCancelDialogClose = () => { if (!cancelling) { setCancelDialogOpen(false); setCancelTarget(null); } };

  const isTeamView = isManager && !!teamFilter;
  const hasActiveFilters = statusFilter || leaveTypeFilter || startDateFilter || endDateFilter || userFilter || teamFilter;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, color: 'primary.main', fontWeight: 600 }}>
        {isTeamView && userFilter !== user?.id ? 'Team Leave History' : 'Leave History'}
      </Typography>

      {/* Filter Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <FilterListIcon color="action" />
          <Typography variant="subtitle1" fontWeight={600}>Filters</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          {isManager && teams.length > 0 && (
            <TextField
              select
              label="Team"
              value={teamFilter}
              onChange={(e) => { setTeamFilter(e.target.value); setUserFilter(''); setPage(0); }}
              size="small"
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">All Teams</MenuItem>
              {teams.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </TextField>
          )}
          {isManager && teamMembers.length > 0 && (
            <TextField
              select
              label="Employee"
              value={userFilter}
              onChange={(e) => { setUserFilter(e.target.value); setPage(0); }}
              size="small"
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All (Me + Team)</MenuItem>
              <MenuItem value={user!.id}>Me ({user!.full_name})</MenuItem>
              <MenuItem value="team_only">Only Team</MenuItem>
              {(teamFilter ? teamMembers.filter((m) => m.team_id === teamFilter) : teamMembers).map((m) => (
                <MenuItem key={m.id} value={m.id}>{m.full_name}</MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            select label="Status" value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            size="small" sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </TextField>
          <TextField
            select label="Leave Type" value={leaveTypeFilter}
            onChange={(e) => { setLeaveTypeFilter(e.target.value); setPage(0); }}
            size="small" sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All</MenuItem>
            {leaveTypes.map((lt) => (<MenuItem key={lt.id} value={lt.id}>{lt.name}</MenuItem>))}
          </TextField>
          <TextField label="From Date" type="date" value={startDateFilter}
            onChange={(e) => { setStartDateFilter(e.target.value); setPage(0); }}
            size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 160 }} />
          <TextField label="To Date" type="date" value={endDateFilter}
            onChange={(e) => { setEndDateFilter(e.target.value); setPage(0); }}
            size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 160 }} />
          {hasActiveFilters && (
            <Button variant="outlined" size="small" onClick={handleClearFilters}>Clear Filters</Button>
          )}
        </Box>
      </Paper>

      {/* Table */}
      <Paper>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px"><CircularProgress /></Box>
        ) : requests.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              {hasActiveFilters ? 'No leave requests match your filters.' : 'No leave requests found.'}
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {isManager && <TableCell sx={{ fontWeight: 600 }}>Who</TableCell>}
                    <TableCell>
                      <TableSortLabel active={sortField === 'date'} direction={sortField === 'date' ? sortDirection : 'asc'} onClick={() => handleSortChange('date')}>
                        Dates
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Leave Type</TableCell>
                    <TableCell>Total Days</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Requested</TableCell>
                    <TableCell>Approved</TableCell>
                    <TableCell>
                      <TableSortLabel active={sortField === 'status'} direction={sortField === 'status' ? sortDirection : 'asc'} onClick={() => handleSortChange('status')}>
                        Status
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id} hover>
                      {isManager && (
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">{req.user?.full_name ?? '—'}</Typography>
                        </TableCell>
                      )}
                      <TableCell>
                        {new Date(req.start_date + 'T00:00:00').toLocaleDateString()} –{' '}
                        {new Date(req.end_date + 'T00:00:00').toLocaleDateString()}
                      </TableCell>
                      <TableCell>{req.leave_type?.name ?? 'N/A'}</TableCell>
                      <TableCell>{req.total_days}</TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {req.reason || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{new Date(req.created_at).toLocaleDateString()}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{req.approved_at ? new Date(req.approved_at).toLocaleDateString() : '—'}</Typography>
                      </TableCell>
                      <TableCell><Chip label={req.status} color={statusColorMap[req.status]} size="small" /></TableCell>
                      <TableCell>
                        {req.status === 'pending' && req.user_id === user?.id && (
                          <IconButton size="small" color="error" onClick={() => handleCancelClick(req)} title="Cancel request">
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={totalCount} page={page} onPageChange={handlePageChange}
              rowsPerPage={rowsPerPage} onRowsPerPageChange={handleRowsPerPageChange} rowsPerPageOptions={[5, 10, 25]} />
          </>
        )}
      </Paper>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onClose={handleCancelDialogClose}>
        <DialogTitle>Cancel Leave Request</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel this leave request
            {cancelTarget && (<>
              {' '}for <strong>{new Date(cancelTarget.start_date).toLocaleDateString()} – {new Date(cancelTarget.end_date).toLocaleDateString()}</strong>
              {' '}({cancelTarget.total_days} day{cancelTarget.total_days !== 1 ? 's' : ''})
            </>)}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDialogClose} disabled={cancelling}>No, Keep It</Button>
          <Button onClick={handleCancelConfirm} color="error" variant="contained" disabled={cancelling}
            startIcon={cancelling ? <CircularProgress size={16} /> : undefined}>
            {cancelling ? 'Cancelling...' : 'Yes, Cancel Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LeaveHistory;
