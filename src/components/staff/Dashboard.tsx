// src/components/staff/Dashboard.tsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  List,
  ListItem,
  ListItemText,
  Tooltip,
} from '@mui/material';
import {
  Add,
  CalendarMonth,
  EventNote,
  InfoOutlined,
  WarningAmber,
} from '@mui/icons-material';
import { RootState, AppDispatch } from '../../store';
import {
  fetchLeaveBalances,
  fetchLeaveRequests,
  fetchHolidays,
} from '../../store/slices/leaveSlice';
import { EnhancedLeaveBalanceSummary, LeaveRequest, Holiday } from '../../types';

const statusColorMap: Record<LeaveRequest['status'], 'warning' | 'success' | 'error' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'default',
};

const tierLabelMap: Record<string, string> = {
  tier1: 'Tier 1',
  tier2: 'Tier 2',
  tier3: 'Tier 3',
};

const StaffDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { balances, requests, holidays, loading, error } = useSelector(
    (state: RootState) => state.leave
  );

  useEffect(() => {
    if (user) {
      dispatch(fetchLeaveBalances({ userId: user.id, hireDate: user.hire_date, birthDate: user.birth_date || '', companyId: user.company_id }));
      dispatch(fetchLeaveRequests(user.id));
      dispatch(fetchHolidays(user.company_id));
    }
  }, [dispatch, user]);

  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const upcomingHolidays = holidays
    .filter((h) => new Date(h.holiday_date) >= new Date())
    .sort((a, b) => new Date(a.holiday_date).getTime() - new Date(b.holiday_date).getTime());

  if (loading && balances.length === 0) {
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
          My Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/staff/request')}
        >
          Request Leave
        </Button>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                if (user) {
                  dispatch(fetchLeaveBalances({ userId: user.id, hireDate: user.hire_date, birthDate: user.birth_date || '', companyId: user.company_id }));
                  dispatch(fetchLeaveRequests(user.id));
                  dispatch(fetchHolidays(user.company_id));
                }
              }}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Leave Balance Cards */}
      <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 600 }}>
        Leave Balances
      </Typography>
      {balances.length > 0 && balances[0].period_start && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          Period: {new Date(balances[0].period_start + 'T00:00:00').toLocaleDateString()} — {new Date(balances[0].period_end + 'T00:00:00').toLocaleDateString()}
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        {balances.filter((b: EnhancedLeaveBalanceSummary) => {
          const name = b.leave_type_name.toLowerCase();
          return name.includes('annual') || name.includes('casual') || name.includes('sick') || b.used > 0;
        }).map((balance: EnhancedLeaveBalanceSummary) => (
          <Card
            key={balance.leave_type_id}
            sx={{
              flex: '1 1 220px',
              minWidth: '220px',
              borderTop: 4,
              borderColor: balance.color_code,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {balance.leave_type_name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  {balance.seniority_tier && tierLabelMap[balance.seniority_tier] && (
                    <Chip label={tierLabelMap[balance.seniority_tier]} size="small" variant="outlined" />
                  )}
                  {balance.is_age_eligible && (
                    <Tooltip title="Age-based minimum entitlement applies (≤18 or ≥50)">
                      <InfoOutlined fontSize="small" color="info" />
                    </Tooltip>
                  )}
                </Box>
              </Box>
              <Typography
                variant="h4"
                sx={{ color: balance.remaining < 0 ? 'error.main' : balance.color_code, mb: 1 }}
              >
                {balance.remaining}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                remaining
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Allocated: {balance.allocated}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Used: {balance.used}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Pending: {balance.pending}
                </Typography>
              </Box>
              {/* Enhanced balance details */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                {balance.base_entitlement != null && (
                  <Typography variant="caption" color="text.secondary">
                    Base: {balance.base_entitlement}
                  </Typography>
                )}
                {balance.carried_over > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    Carryover: {balance.carried_over}
                  </Typography>
                )}
                {balance.negative_from_previous > 0 && (
                  <Typography variant="caption" sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <WarningAmber sx={{ fontSize: 14 }} />
                    Deficit: -{balance.negative_from_previous}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
        {balances.length === 0 && !loading && (
          <Typography variant="body2" color="text.secondary">
            No leave balances available.
          </Typography>
        )}
      </Box>

      {/* Recent Leave Requests */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <EventNote color="primary" /> Recent Requests
      </Typography>
      <Paper sx={{ mb: 4 }}>
        {recentRequests.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Dates</TableCell>
                  <TableCell>Days</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentRequests.map((req: LeaveRequest) => (
                  <TableRow key={req.id} hover>
                    <TableCell>{req.leave_type?.name ?? 'N/A'}</TableCell>
                    <TableCell>
                      {new Date(req.start_date).toLocaleDateString()} –{' '}
                      {new Date(req.end_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{req.total_days}</TableCell>
                    <TableCell>
                      <Chip
                        label={req.status}
                        color={statusColorMap[req.status]}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No leave requests yet.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Upcoming Holidays */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CalendarMonth color="primary" /> Upcoming Holidays
      </Typography>
      <Paper sx={{ mb: 4 }}>
        {upcomingHolidays.length > 0 ? (
          <List disablePadding>
            {upcomingHolidays.map((holiday: Holiday) => (
              <ListItem key={holiday.id} divider>
                <ListItemText
                  primary={holiday.name}
                  secondary={new Date(holiday.holiday_date).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No upcoming holidays.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default StaffDashboard;
