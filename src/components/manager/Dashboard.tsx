// src/components/manager/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  People,
  BeachAccess,
  PendingActions,
  EventNote,
  Refresh,
  ArrowForward,
} from '@mui/icons-material';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import { BalanceService } from '../../services/balance';
import { EnhancedLeaveBalanceSummary } from '../../types';
import { selectWorkdayConfig } from '../../store/slices/organizationSlice';

interface TeamStats {
  totalMembers: number;
  onLeaveToday: number;
  pendingApprovals: number;
  upcomingLeaves: number;
}

interface WeekDayAvailability {
  date: Date;
  label: string;
  dayName: string;
  onLeaveCount: number;
  memberNames: string[];
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const workdayConfig = useSelector(selectWorkdayConfig);
  const [stats, setStats] = useState<TeamStats>({
    totalMembers: 0,
    onLeaveToday: 0,
    pendingApprovals: 0,
    upcomingLeaves: 0,
  });
  const [weekAvailability, setWeekAvailability] = useState<WeekDayAvailability[]>([]);
  const [personalBalances, setPersonalBalances] = useState<EnhancedLeaveBalanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch team members (staff assigned to this manager)
      if (!currentUser?.id) {
        setError('No authenticated user found');
        return;
      }

      const { data: teamMembers, error: teamError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('manager_id', currentUser.id);

      if (teamError) throw teamError;

      const todayLocal = new Date();
      const today = `${todayLocal.getFullYear()}-${(todayLocal.getMonth() + 1).toString().padStart(2, '0')}-${todayLocal.getDate().toString().padStart(2, '0')}`;

      // Fetch pending approvals count
      const { count: pendingCount, error: pendingError } = await supabase
        .from('leave_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .in(
          'user_id',
          (teamMembers ?? []).map((m) => m.id)
        );

      if (pendingError) throw pendingError;

      // Fetch on leave today
      const { data: onLeaveToday, error: onLeaveError } = await supabase
        .from('leave_requests')
        .select('user_id, user:user_id(full_name)')
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today)
        .in(
          'user_id',
          (teamMembers ?? []).map((m) => m.id)
        );

      if (onLeaveError) throw onLeaveError;

      // Fetch upcoming leaves (next 30 days)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const futureDateStr = `${futureDate.getFullYear()}-${(futureDate.getMonth() + 1).toString().padStart(2, '0')}-${futureDate.getDate().toString().padStart(2, '0')}`;

      const { count: upcomingCount, error: upcomingError } = await supabase
        .from('leave_requests')
        .select('id', { count: 'exact', head: true })
        .in('status', ['approved', 'pending'])
        .gt('start_date', today)
        .lte('start_date', futureDateStr)
        .in(
          'user_id',
          (teamMembers ?? []).map((m) => m.id)
        );

      if (upcomingError) throw upcomingError;

      setStats({
        totalMembers: teamMembers?.length ?? 0,
        onLeaveToday: onLeaveToday?.length ?? 0,
        pendingApprovals: pendingCount ?? 0,
        upcomingLeaves: upcomingCount ?? 0,
      });

      // Build 4-week availability
      await buildWeekAvailability(teamMembers ?? []);

      // Fetch personal leave balances
      if (currentUser) {
        try {
          const bal = await BalanceService.getBalances(currentUser.id, currentUser.hire_date, currentUser.birth_date || '', currentUser.company_id);
          setPersonalBalances(bal);
        } catch { /* skip personal balance errors */ }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const buildWeekAvailability = async (
    teamMembers: { id: string; full_name: string }[]
  ) => {
    const sortedWorkdays = [...workdayConfig].sort((a, b) => a - b);

    const now = new Date();
    const dayOfWeek = now.getDay();
    // Find the start of the current week (Sunday)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    // Generate 4 weeks of configured workdays
    const weekDays: Date[] = [];
    for (let week = 0; week < 4; week++) {
      for (const wd of sortedWorkdays) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + week * 7 + wd);
        weekDays.push(d);
      }
    }

    const pad = (n: number) => n.toString().padStart(2, '0');
    const toLocalDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const rangeStart = toLocalDate(weekDays[0]);
    const rangeEnd = toLocalDate(weekDays[weekDays.length - 1]);

    const memberIds = teamMembers.map((m) => m.id);
    if (memberIds.length === 0) {
      setWeekAvailability(
        weekDays.map((d) => ({
          date: d,
          label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          dayName: DAY_NAMES[d.getDay()],
          onLeaveCount: 0,
          memberNames: [],
        }))
      );
      return;
    }

    const { data: weekLeaves, error: weekError } = await supabase
      .from('leave_requests')
      .select('user_id, start_date, end_date, leave_type_id, user:user_id(full_name), leave_type:leave_type_id(name)')
      .in('status', ['approved', 'pending'])
      .lte('start_date', rangeEnd)
      .gte('end_date', rangeStart)
      .in('user_id', memberIds);

    if (weekError) {
      console.error('Error fetching week leaves:', weekError);
    }

    const availability: WeekDayAvailability[] = weekDays.map((d) => {
      const dateStr = toLocalDate(d);
      const onLeave = (weekLeaves ?? []).filter(
        (l: any) => l.start_date <= dateStr && l.end_date >= dateStr
      );
      const names = onLeave.map((l: any) => {
        const name = (l.user as any)?.full_name ?? 'Unknown';
        const leaveType = (l.leave_type as any)?.name;
        return leaveType ? `${name} (${leaveType})` : name;
      });
      return {
        date: d,
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        dayName: DAY_NAMES[d.getDay()],
        onLeaveCount: onLeave.length,
        memberNames: names,
      };
    });

    setWeekAvailability(availability);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
        <Button onClick={fetchDashboardData} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  const todayDate = new Date();
  const todayStr = `${todayDate.getFullYear()}-${(todayDate.getMonth() + 1).toString().padStart(2, '0')}-${todayDate.getDate().toString().padStart(2, '0')}`;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 600 }}>
          Manager Dashboard
        </Typography>
        <Button variant="outlined" startIcon={<Refresh />} onClick={fetchDashboardData}>
          Refresh
        </Button>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        {/* Total Team Members */}
        <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <People color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Team Members</Typography>
            </Box>
            <Typography variant="h4" color="primary">
              {stats.totalMembers}
            </Typography>
          </CardContent>
        </Card>

        {/* On Leave Today */}
        <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <BeachAccess sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="h6">On Leave Today</Typography>
            </Box>
            <Typography variant="h4" sx={{ color: 'warning.main' }}>
              {stats.onLeaveToday}
            </Typography>
          </CardContent>
        </Card>

        {/* Pending Approvals — Clickable */}
        <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <CardActionArea onClick={() => navigate('/manager/approvals')}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PendingActions sx={{ mr: 1, color: 'error.main' }} />
                <Typography variant="h6">Pending Approvals</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h4" sx={{ color: 'error.main' }}>
                  {stats.pendingApprovals}
                </Typography>
                <ArrowForward color="action" />
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>

        {/* Upcoming Leaves */}
        <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EventNote sx={{ mr: 1, color: 'info.main' }} />
              <Typography variant="h6">Upcoming Leaves</Typography>
            </Box>
            <Typography variant="h4" sx={{ color: 'info.main' }}>
              {stats.upcomingLeaves}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Next 30 days
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Personal Leave Balances */}
      {personalBalances.length > 0 && (
        <>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            My Leave Balances
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
            {personalBalances.filter((b) => {
              const name = b.leave_type_name.toLowerCase();
              return name.includes('annual') || name.includes('casual') || name.includes('sick') || b.used > 0;
            }).map((balance) => (
              <Card
                key={balance.leave_type_id}
                sx={{ flex: '1 1 200px', minWidth: '200px', borderTop: 4, borderColor: balance.color_code }}
              >
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    {balance.leave_type_name}
                  </Typography>
                  <Typography variant="h4" sx={{ color: balance.remaining < 0 ? 'error.main' : balance.color_code, mb: 1 }}>
                    {balance.remaining}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">remaining</Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">Allocated: {balance.allocated}</Typography>
                    <Typography variant="caption" color="text.secondary">Used: {balance.used}</Typography>
                    <Typography variant="caption" color="text.secondary">Pending: {balance.pending}</Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </>
      )}

      {/* Team Availability — 4 Weeks */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Team Availability — Next 4 Weeks
      </Typography>
      <Paper sx={{ mb: 4, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: 60 }}>Week</TableCell>
                {[...workdayConfig].sort((a, b) => a - b).map((dayIdx) => (
                  <TableCell key={dayIdx} align="center" sx={{ fontWeight: 600 }}>
                    {DAY_NAMES[dayIdx]}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {[0, 1, 2, 3].map((weekIdx) => {
                const workdayCount = [...workdayConfig].length;
                const weekDays = weekAvailability.slice(weekIdx * workdayCount, weekIdx * workdayCount + workdayCount);
                if (weekDays.length === 0) return null;
                const weekLabel = weekDays[0]?.label;
                return (
                  <TableRow key={weekIdx}>
                    <TableCell>
                      <Typography variant="caption" fontWeight={600}>{weekLabel}</Typography>
                    </TableCell>
                    {weekDays.map((day) => (
                      <TableCell
                        key={day.label}
                        align="center"
                        sx={{
                          bgcolor:
                            `${day.date.getFullYear()}-${(day.date.getMonth() + 1).toString().padStart(2, '0')}-${day.date.getDate().toString().padStart(2, '0')}` === todayStr
                              ? 'primary.light'
                              : 'transparent',
                          verticalAlign: 'top',
                        }}
                      >
                        <Typography variant="caption" display="block" color="text.secondary">
                          {day.label}
                        </Typography>
                        {day.onLeaveCount === 0 ? (
                          <Chip label="✓" color="success" size="small" variant="outlined" />
                        ) : (
                          <Box>
                            <Chip
                              label={`${day.onLeaveCount}`}
                              color="warning"
                              size="small"
                              sx={{ mb: 0.5 }}
                            />
                            {day.memberNames.map((name, idx) => (
                              <Typography key={idx} variant="caption" display="block" color="text.secondary" noWrap>
                                {name}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default ManagerDashboard;
