// src/components/manager/TeamBalances/index.tsx — Manager team balances (batched queries)
import React, { useEffect, useState } from 'react';
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
  CircularProgress,
  Alert,
  Button,
  Chip,
  Popover,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { supabase } from '../../../config/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { BalanceService } from '../../../services/balance';

interface LeaveTypeInfo {
  id: string;
  name: string;
  color_code: string;
  default_days: number;
}

interface RequestDetail {
  start_date: string;
  total_days: number;
  status: string;
}

interface CellData {
  allocated: number;
  used: number;
  pending: number;
  remaining: number;
  usedDetails: RequestDetail[];
  pendingDetails: RequestDetail[];
}

interface StaffRow {
  userId: string;
  fullName: string;
  periodLabel: string;
  cells: CellData[];
}

const TeamBalances: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [popover, setPopover] = useState<{ anchor: HTMLElement; details: RequestDetail[] } | null>(null);

  const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString();

  useEffect(() => {
    if (user) fetchData();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      let ltQuery = supabase
        .from('leave_types')
        .select('id, name, color_code, default_days')
        .eq('is_active', true)
        .order('name');
      if (user?.company_id) {
        ltQuery = ltQuery.eq('company_id', user.company_id);
      }
      const { data: ltData, error: ltErr } = await ltQuery;
      if (ltErr) throw ltErr;
      const types = ltData || [];
      setLeaveTypes(types);

      const { data: staff, error: staffErr } = await supabase
        .from('users')
        .select('id, full_name, hire_date')
        .eq('manager_id', user!.id)
        .order('full_name');
      if (staffErr) throw staffErr;
      if (!staff || staff.length === 0) { setRows([]); setLoading(false); return; }

      const memberIds = staff.map((s) => s.id);

      // Compute period boundaries per staff member and find min/max for DB-level filtering
      const staffPeriods = staff.map((s) => {
        const period = BalanceService.getCurrentPeriod(s.hire_date);
        return { ...s, period };
      });
      const minStart = staffPeriods.reduce((min, sp) => sp.period.start < min ? sp.period.start : min, staffPeriods[0].period.start);
      const maxEnd = staffPeriods.reduce((max, sp) => sp.period.end > max ? sp.period.end : max, staffPeriods[0].period.end);

      const [balRes, appRes, penRes] = await Promise.all([
        supabase.from('leave_balances').select('*').in('user_id', memberIds),
        supabase.from('leave_requests').select('user_id, leave_type_id, total_days, start_date').in('user_id', memberIds).eq('status', 'approved').gte('start_date', minStart).lte('start_date', maxEnd),
        supabase.from('leave_requests').select('user_id, leave_type_id, total_days, start_date').in('user_id', memberIds).eq('status', 'pending').gte('start_date', minStart).lte('start_date', maxEnd),
      ]);
      if (balRes.error) throw balRes.error;
      if (appRes.error) throw appRes.error;
      if (penRes.error) throw penRes.error;

      const allBalances = balRes.data || [];
      const allApproved = appRes.data || [];
      const allPending = penRes.data || [];

      const result: StaffRow[] = staff.map((s) => {
        const period = BalanceService.getCurrentPeriod(s.hire_date);
        const { start: ps, end: pe } = period;
        const ub = allBalances.filter((b) => b.user_id === s.id && b.period_start === ps && b.period_end === pe);
        const ua = allApproved.filter((r) => r.user_id === s.id && r.start_date >= ps && r.start_date <= pe);
        const up = allPending.filter((r) => r.user_id === s.id && r.start_date >= ps && r.start_date <= pe);

        const cells: CellData[] = types.map((lt) => {
          const br = ub.find((b) => b.leave_type_id === lt.id);
          const allocated = br?.total_earned ?? lt.default_days;
          const usedReqs = ua.filter((r) => r.leave_type_id === lt.id);
          const pendReqs = up.filter((r) => r.leave_type_id === lt.id);
          const used = usedReqs.reduce((sum, r) => sum + r.total_days, 0);
          const pending = pendReqs.reduce((sum, r) => sum + r.total_days, 0);
          return {
            allocated,
            used,
            pending,
            remaining: allocated - used - pending,
            usedDetails: usedReqs.map((r) => ({ start_date: r.start_date, total_days: r.total_days, status: 'approved' })),
            pendingDetails: pendReqs.map((r) => ({ start_date: r.start_date, total_days: r.total_days, status: 'pending' })),
          };
        });
        return { userId: s.id, fullName: s.full_name, periodLabel: `${formatDate(ps)} — ${formatDate(pe)}`, cells };
      });
      setRows(result);

      // Filter leave types: always show annual/casual/sick, others only if someone used them
      const visibleIdx = types.map((lt, idx) => {
        const name = lt.name.toLowerCase();
        if (name.includes('annual') || name.includes('casual') || name.includes('sick')) return true;
        return result.some((r) => r.cells[idx].used > 0);
      });
      setLeaveTypes(types.filter((_, idx) => visibleIdx[idx]));
      setRows(result.map((r) => ({ ...r, cells: r.cells.filter((_, idx) => visibleIdx[idx]) })));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (e: React.MouseEvent<HTMLElement>, details: RequestDetail[]) => {
    if (details.length > 0) setPopover({ anchor: e.currentTarget, details });
  };

  if (loading) {
    return (<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>);
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 600 }}>Team Leave Balances</Typography>
        <Button variant="outlined" startIcon={<Refresh />} onClick={fetchData}>Refresh</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
      {rows.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">No staff members found.</Typography></Paper>
      ) : (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Period</TableCell>
                  {leaveTypes.map((lt) => (
                    <TableCell key={lt.id} align="center" sx={{ fontWeight: 600 }}>
                      <Chip label={lt.name} size="small" sx={{ bgcolor: lt.color_code, color: '#fff', fontWeight: 600 }} />
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.userId} hover>
                    <TableCell><Typography fontWeight="medium">{row.fullName}</Typography></TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{row.periodLabel}</Typography></TableCell>
                    {row.cells.map((c, idx) => (
                      <TableCell
                        key={idx}
                        align="center"
                        sx={{ cursor: (c.usedDetails.length + c.pendingDetails.length) > 0 ? 'pointer' : 'default' }}
                        onClick={(e) => handleCellClick(e, [...c.usedDetails, ...c.pendingDetails])}
                      >
                        <Typography variant="body2" fontWeight="bold" color={c.remaining < 0 ? 'error.main' : 'text.primary'}>{c.remaining}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {c.allocated} alloc · {c.used} used · {c.pending} pend
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Detail popover */}
      <Popover
        open={Boolean(popover)}
        anchorEl={popover?.anchor}
        onClose={() => setPopover(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        {popover && (
          <Box sx={{ p: 2, minWidth: 220 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Request Details</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ py: 0.5, fontWeight: 600 }}>Start Date</TableCell>
                  <TableCell sx={{ py: 0.5, fontWeight: 600 }} align="right">Days</TableCell>
                  <TableCell sx={{ py: 0.5, fontWeight: 600 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {popover.details.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ py: 0.5 }}>{formatDate(d.start_date)}</TableCell>
                    <TableCell sx={{ py: 0.5 }} align="right">{d.total_days}</TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      <Chip label={d.status} size="small" color={d.status === 'approved' ? 'success' : 'warning'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Popover>
    </Box>
  );
};

export default TeamBalances;
