// src/components/manager/Reports.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Paper,
} from '@mui/material';
import { Refresh, Download, Assessment } from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { supabase } from '../../config/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { LeaveRequest, LeaveType, User } from '../../types';

interface ReportLeaveRequest extends LeaveRequest {
  leave_type?: LeaveType;
  user?: User;
}

const Reports: React.FC = () => {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const [requests, setRequests] = useState<ReportLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default date range: current year
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);

  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch team members assigned to this manager
      const { data: teamMembers, error: teamError } = await supabase
        .from('users')
        .select('id')
        .eq('manager_id', currentUser!.id);

      if (teamError) throw teamError;

      const memberIds = (teamMembers ?? []).map((m) => m.id);
      if (memberIds.length === 0) {
        setRequests([]);
        return;
      }

      const { data, error: reqError } = await supabase
        .from('leave_requests')
        .select(`
          *,
          leave_type:leave_type_id (*),
          user:user_id (*)
        `)
        .in('user_id', memberIds)
        .in('status', ['approved', 'pending'])
        .gte('start_date', startDate)
        .lte('start_date', endDate)
        .order('start_date', { ascending: true });

      if (reqError) throw reqError;
      setRequests(data ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  // Chart data: leave usage per employee
  const perEmployeeData = useMemo(() => {
    const map = new Map<string, { name: string; days: number }>();
    for (const r of requests) {
      const name = r.user?.full_name ?? 'Unknown';
      const existing = map.get(r.user_id) ?? { name, days: 0 };
      existing.days += r.total_days;
      map.set(r.user_id, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.days - a.days);
  }, [requests]);

  // Chart data: leave usage per leave type
  const perLeaveTypeData = useMemo(() => {
    const map = new Map<string, { name: string; days: number; color: string }>();
    for (const r of requests) {
      const name = r.leave_type?.name ?? 'Unknown';
      const color = r.leave_type?.color_code ?? '#8884d8';
      const existing = map.get(r.leave_type_id) ?? { name, days: 0, color };
      existing.days += r.total_days;
      map.set(r.leave_type_id, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.days - a.days);
  }, [requests]);

  // Chart data: leave usage per month
  const perMonthData = useMemo(() => {
    const months: { month: string; days: number }[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthMap = new Map<number, number>();

    for (const r of requests) {
      const monthIdx = new Date(r.start_date + 'T00:00:00').getMonth();
      monthMap.set(monthIdx, (monthMap.get(monthIdx) ?? 0) + r.total_days);
    }

    for (let i = 0; i < 12; i++) {
      months.push({ month: monthNames[i], days: monthMap.get(i) ?? 0 });
    }
    return months;
  }, [requests]);

  const PIE_COLORS = ['#818CF8', '#FCA5A5', '#4ADE80', '#FCD34D', '#FB923C', '#A78BFA', '#6EE7B7', '#FECACA'];

  const handleExportCSV = () => {
    const headers = ['Employee', 'Leave Type', 'Start Date', 'End Date', 'Total Days', 'Status', 'Reason'];
    const rows = requests.map((r) => [
      r.user?.full_name ?? '',
      r.leave_type?.name ?? '',
      r.start_date,
      r.end_date,
      r.total_days.toString(),
      r.status,
      (r.reason ?? '').replace(/,/g, ';'),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leave-report-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
        <Button onClick={fetchReportData} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  const totalDays = requests.reduce((sum, r) => sum + r.total_days, 0);
  const uniqueEmployees = new Set(requests.map((r) => r.user_id)).size;
  const mostUsedType = perLeaveTypeData.length > 0 ? perLeaveTypeData[0].name : 'N/A';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment color="primary" />
          <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 600 }}>
            Leave Reports
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={fetchReportData}>
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExportCSV}
            disabled={requests.length === 0}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* Date Range Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Date Range Filter
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            size="small"
          />
          <TextField
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            size="small"
          />
        </Box>
      </Paper>

      {/* Summary Statistics */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Card sx={{ flex: '1 1 180px', minWidth: '180px' }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">Total Leave Days</Typography>
            <Typography variant="h4" color="primary">{totalDays}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 180px', minWidth: '180px' }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">Employees</Typography>
            <Typography variant="h4" color="primary">{uniqueEmployees}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 180px', minWidth: '180px' }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">Total Requests</Typography>
            <Typography variant="h4" color="primary">{requests.length}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 180px', minWidth: '180px' }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">Most Used Type</Typography>
            <Typography variant="h5" color="primary">{mostUsedType}</Typography>
          </CardContent>
        </Card>
      </Box>

      {requests.length === 0 ? (
        <Alert severity="info">No leave data found for the selected date range.</Alert>
      ) : (
        <>
          {/* Chart: Leave Usage Per Employee */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Leave Usage Per Employee
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={perEmployeeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="days" name="Days" fill="#FCA5A5" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>

          {/* Chart: Leave Usage Per Leave Type */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
            <Paper sx={{ p: 3, flex: '1 1 400px' }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Leave Usage Per Leave Type
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={perLeaveTypeData}
                    dataKey="days"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }: { name?: string; value?: number }) => `${name ?? ''}: ${value ?? 0}d`}
                  >
                    {perLeaveTypeData.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Paper>

            {/* Chart: Leave Usage Per Month */}
            <Paper sx={{ p: 3, flex: '1 1 400px' }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Leave Usage Per Month
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={perMonthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="days" name="Days" fill="#818CF8" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Box>
        </>
      )}
    </Box>
  );
};

export default Reports;
