// src/components/general-manager/LeaveView/index.tsx — Department Manager Leave View
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
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../config/supabase';
import { LeaveRequest, Team } from '../../../types';

const statusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'default',
};

const DepartmentManagerLeaveView: React.FC = () => {
  const { user: currentUser } = useAuth();

  const [teams, setTeams] = useState<Team[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [teamFilter, setTeamFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Load teams for the department manager's department
  useEffect(() => {
    if (!currentUser?.department_id) return;
    const loadTeams = async () => {
      const { data, error: err } = await supabase
        .from('teams')
        .select('*')
        .eq('department_id', currentUser.department_id!)
        .order('name');
      if (!err) setTeams(data ?? []);
    };
    loadTeams();
  }, [currentUser?.department_id]);

  // Fetch leave requests scoped to department
  const fetchRequests = useCallback(async () => {
    if (!currentUser?.department_id) return;
    setLoading(true);
    setError(null);
    try {
      // Get users in this department, optionally filtered by team
      let usersQuery = supabase
        .from('users')
        .select('id')
        .eq('department_id', currentUser.department_id!);

      if (teamFilter) {
        usersQuery = usersQuery.eq('team_id', teamFilter);
      }

      const { data: deptUsers, error: usersErr } = await usersQuery;
      if (usersErr) throw usersErr;

      const userIds = (deptUsers ?? []).map((u) => u.id);
      if (userIds.length === 0) {
        setRequests([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('leave_requests')
        .select('*, leave_type:leave_types(*), user:users!leave_requests_user_id_fkey(*)', { count: 'exact' })
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
        .range(page * rowsPerPage, page * rowsPerPage + rowsPerPage - 1);

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, count, error: reqErr } = await query;
      if (reqErr) throw reqErr;

      setRequests((data as LeaveRequest[]) ?? []);
      setTotalCount(count ?? 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }, [currentUser, page, rowsPerPage, teamFilter, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleTeamChange = (e: SelectChangeEvent) => {
    setTeamFilter(e.target.value);
    setPage(0);
  };

  const handleStatusChange = (e: SelectChangeEvent) => {
    setStatusFilter(e.target.value);
    setPage(0);
  };

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const teamMap = new Map(teams.map((t) => [t.id, t.name]));

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, color: 'primary.main', fontWeight: 600 }}>
        Leave Requests
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Team</InputLabel>
            <Select value={teamFilter} label="Team" onChange={handleTeamChange}>
              <MenuItem value="">All Teams</MenuItem>
              {teams.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={handleStatusChange}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : requests.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No leave requests found.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Team</TableCell>
                    <TableCell>Leave Type</TableCell>
                    <TableCell>Dates</TableCell>
                    <TableCell>Days</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id} hover>
                      <TableCell>{req.user?.full_name ?? 'Unknown'}</TableCell>
                      <TableCell>
                        {req.user?.team_id ? teamMap.get(req.user.team_id) ?? '—' : '—'}
                      </TableCell>
                      <TableCell>
                        {req.leave_type ? (
                          <Chip
                            label={req.leave_type.name}
                            size="small"
                            sx={{ backgroundColor: req.leave_type.color_code, color: '#fff' }}
                          />
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {new Date(req.start_date).toLocaleDateString()} –{' '}
                        {new Date(req.end_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{req.total_days}</TableCell>
                      <TableCell>
                        <Chip
                          label={req.status}
                          size="small"
                          color={statusColor[req.status] ?? 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={handlePageChange}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleRowsPerPageChange}
              rowsPerPageOptions={[5, 10, 25]}
            />
          </>
        )}
      </Paper>
    </Box>
  );
};

export default DepartmentManagerLeaveView;
