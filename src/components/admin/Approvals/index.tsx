// src/components/admin/Approvals/index.tsx — Admin Approvals (company-wide)
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { updateLeaveStatus } from '../../../store/slices/leaveSlice';
import { LeaveService } from '../../../services/leave';
import { BalanceService } from '../../../services/balance';
import { supabase } from '../../../config/supabase';
import { LeaveRequest, LeaveBalanceSummary } from '../../../types';

const AdminApprovals: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user: currentUser } = useSelector((state: RootState) => state.auth);

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [balances, setBalances] = useState<Record<string, LeaveBalanceSummary>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approved' | 'rejected'>('approved');
  const [actionTarget, setActionTarget] = useState<LeaveRequest | null>(null);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [showPast, setShowPast] = useState(false);
  const [pastRequests, setPastRequests] = useState<LeaveRequest[]>([]);
  const [pastLoading, setPastLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const result = await LeaveService.getRequestsByScope(currentUser, {
        status: 'pending',
        page,
        pageSize: rowsPerPage,
      });
      const data = result.data as LeaveRequest[];
      setRequests(data);
      setTotalCount(result.count);

      const balanceMap: Record<string, LeaveBalanceSummary> = {};
      const seen = new Set<string>();
      for (const req of data) {
        const key = `${req.user_id}_${req.leave_type_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        try {
          const hireDate = (req as any).user?.hire_date || new Date().toISOString().split('T')[0];
          const birthDate = (req as any).user?.birth_date || '';
          const bal = await BalanceService.getBalance(req.user_id, req.leave_type_id, hireDate, birthDate);
          balanceMap[key] = bal;
        } catch { /* skip */ }
      }
      setBalances(balanceMap);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to load pending requests', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [currentUser, page, rowsPerPage]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const fetchPastDecisions = async () => {
    if (!currentUser) return;
    setPastLoading(true);
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, leave_type:leave_type_id(*), user:user_id(*)')
        .in('status', ['approved', 'rejected'])
        .eq('approved_by', currentUser.id)
        .order('approved_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setPastRequests((data as LeaveRequest[]) || []);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to load past decisions', severity: 'error' });
    } finally {
      setPastLoading(false);
    }
  };

  const handleTogglePast = () => {
    const next = !showPast;
    setShowPast(next);
    if (next && pastRequests.length === 0) fetchPastDecisions();
  };

  const handleActionClick = (request: LeaveRequest, action: 'approved' | 'rejected') => {
    setActionTarget(request);
    setActionType(action);
    setComment('');
    setDialogOpen(true);
  };

  const handleActionConfirm = async () => {
    if (!actionTarget || !currentUser) return;
    setProcessing(true);
    try {
      await dispatch(updateLeaveStatus({ id: actionTarget.id, status: actionType, approvedBy: currentUser.id, approvalComment: comment || undefined })).unwrap();
      setSnackbar({ open: true, message: `Request ${actionType} successfully.`, severity: 'success' });
      setDialogOpen(false);
      setActionTarget(null);
      setComment('');
      fetchRequests();
    } catch (err: any) {
      const msg = err.message || err || 'Failed to update request';
      setSnackbar({ open: true, message: msg, severity: 'error' });
      setDialogOpen(false);
      fetchRequests();
    } finally {
      setProcessing(false);
    }
  };

  const handleDialogClose = () => { if (!processing) { setDialogOpen(false); setActionTarget(null); setComment(''); } };
  const getBalance = (request: LeaveRequest): LeaveBalanceSummary | undefined => balances[`${request.user_id}_${request.leave_type_id}`];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, color: 'primary.main', fontWeight: 600 }}>Pending Approvals</Typography>
      <Paper>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px"><CircularProgress /></Box>
        ) : requests.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">No pending leave requests.</Typography></Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Dates</TableCell>
                    <TableCell>Leave Type</TableCell>
                    <TableCell>Total Days</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Remaining Balance</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.map((req) => {
                    const bal = getBalance(req);
                    return (
                      <TableRow key={req.id} hover>
                        <TableCell>{req.user?.full_name ?? 'Unknown'}</TableCell>
                        <TableCell><Chip label={req.user?.role ?? 'staff'} size="small" variant="outlined" /></TableCell>
                        <TableCell>{new Date(req.start_date).toLocaleDateString()} – {new Date(req.end_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {req.leave_type ? <Chip label={req.leave_type.name} size="small" sx={{ backgroundColor: req.leave_type.color_code, color: '#fff' }} /> : 'N/A'}
                        </TableCell>
                        <TableCell>{req.total_days}</TableCell>
                        <TableCell>
                          <Tooltip title={req.reason || ''} arrow>
                            <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.reason || '—'}</Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          {bal ? <Chip label={`${bal.remaining} days`} size="small" color={bal.remaining < 0 ? 'error' : bal.remaining <= req.total_days ? 'warning' : 'success'} variant="outlined" /> : '—'}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Button size="small" variant="contained" color="success" startIcon={<ApproveIcon />} onClick={() => handleActionClick(req, 'approved')}>Approve</Button>
                            <Button size="small" variant="outlined" color="error" startIcon={<RejectIcon />} onClick={() => handleActionClick(req, 'rejected')}>Reject</Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={totalCount} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} rowsPerPageOptions={[5, 10, 25]} />
          </>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>{actionType === 'approved' ? 'Approve' : 'Reject'} Leave Request</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {actionTarget && (<>{actionType === 'approved' ? 'Approve' : 'Reject'} the leave request from <strong>{actionTarget.user?.full_name ?? 'this employee'}</strong> for <strong>{new Date(actionTarget.start_date).toLocaleDateString()} – {new Date(actionTarget.end_date).toLocaleDateString()}</strong> ({actionTarget.total_days} day{actionTarget.total_days !== 1 ? 's' : ''})?</>)}
          </DialogContentText>
          <TextField label="Comment (optional)" multiline rows={3} fullWidth value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment..." />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={processing}>Cancel</Button>
          <Button onClick={handleActionConfirm} variant="contained" color={actionType === 'approved' ? 'success' : 'error'} disabled={processing} startIcon={processing ? <CircularProgress size={16} /> : undefined}>
            {processing ? 'Processing...' : actionType === 'approved' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>

      <Box sx={{ mt: 4 }}>
        <Button variant="text" onClick={handleTogglePast} endIcon={showPast ? <ExpandLess /> : <ExpandMore />} sx={{ mb: 2 }}>
          {showPast ? 'Hide' : 'Show'} Past Decisions
        </Button>
        <Collapse in={showPast}>
          <Paper>
            {pastLoading ? (
              <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>
            ) : pastRequests.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">No past decisions found.</Typography></Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Leave Type</TableCell>
                      <TableCell>Dates</TableCell>
                      <TableCell>Decision</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Comment</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pastRequests.map((req) => (
                      <TableRow key={req.id} hover>
                        <TableCell>{req.user?.full_name ?? 'Unknown'}</TableCell>
                        <TableCell><Chip label={req.user?.role ?? 'staff'} size="small" variant="outlined" /></TableCell>
                        <TableCell>{req.leave_type ? <Chip label={req.leave_type.name} size="small" sx={{ backgroundColor: req.leave_type.color_code, color: '#fff' }} /> : 'N/A'}</TableCell>
                        <TableCell>{new Date(req.start_date).toLocaleDateString()} – {new Date(req.end_date).toLocaleDateString()}</TableCell>
                        <TableCell><Chip label={req.status} size="small" color={req.status === 'approved' ? 'success' : 'error'} /></TableCell>
                        <TableCell>{req.approved_at ? new Date(req.approved_at).toLocaleDateString() : '—'}</TableCell>
                        <TableCell>
                          <Tooltip title={req.approval_comment || ''} arrow>
                            <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.approval_comment || '—'}</Typography>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Collapse>
      </Box>
    </Box>
  );
};

export default AdminApprovals;
