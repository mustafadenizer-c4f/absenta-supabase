// src/components/admin/Reports/index.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TablePagination,
} from '@mui/material';
import { Refresh, Download, Assessment, FilterList } from '@mui/icons-material';
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
import { RootState, AppDispatch } from '../../../store';
import { fetchCompanies, fetchGroups, fetchDepartments } from '../../../store/slices/organizationSlice';
import { LeaveService, LeaveRequestFilters } from '../../../services/leave';
import { LeaveRequest, User, Company, Group, Department } from '../../../types';

interface ReportLeaveRequest extends LeaveRequest {
  user?: User & {
    company_id?: string;
    group_id?: string;
    department_id?: string;
  };
}

const AdminReports: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const { companies, groups, departments } = useSelector((state: RootState) => state.organization);

  const [requests, setRequests] = useState<ReportLeaveRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Filtered groups/departments based on cascading selection
  const filteredGroups = useMemo(() => {
    if (!selectedCompanyId) return groups;
    return groups.filter((g) => g.company_id === selectedCompanyId);
  }, [groups, selectedCompanyId]);

  const filteredDepartments = useMemo(() => {
    if (!selectedGroupId) return departments;
    return departments.filter((d) => d.group_id === selectedGroupId);
  }, [departments, selectedGroupId]);

  // Load org data on mount
  useEffect(() => {
    dispatch(fetchCompanies());
    dispatch(fetchGroups(undefined));
    dispatch(fetchDepartments(undefined));
  }, [dispatch]);

  const fetchReportData = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError(null);

      const filters: LeaveRequestFilters = {
        page: 0,
        pageSize: 10000, // Fetch all for statistics
        startDate,
        endDate,
      };

      if (selectedCompanyId) filters.company_id = selectedCompanyId;
      if (selectedGroupId) filters.group_id = selectedGroupId;
      if (selectedDepartmentId) filters.department_id = selectedDepartmentId;
      if (statusFilter) filters.status = statusFilter;

      const result = await LeaveService.getRequestsByScope(currentUser, filters);
      setRequests(result.data ?? []);
      setTotalCount(result.count);
    } catch (err: any) {
      setError(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [currentUser, startDate, endDate, selectedCompanyId, selectedGroupId, selectedDepartmentId, statusFilter]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Reset cascading filters
  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setSelectedGroupId('');
    setSelectedDepartmentId('');
    setPage(0);
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedDepartmentId('');
    setPage(0);
  };

  // Lookup helpers
  const companyMap = useMemo(() => {
    const map = new Map<string, Company>();
    companies.forEach((c) => map.set(c.id, c));
    return map;
  }, [companies]);

  const groupMap = useMemo(() => {
    const map = new Map<string, Group>();
    groups.forEach((g) => map.set(g.id, g));
    return map;
  }, [groups]);

  const departmentMap = useMemo(() => {
    const map = new Map<string, Department>();
    departments.forEach((d) => map.set(d.id, d));
    return map;
  }, [departments]);

  const getCompanyName = (user?: ReportLeaveRequest['user']) =>
    user?.company_id ? companyMap.get(user.company_id)?.name ?? '—' : '—';

  const getGroupName = (user?: ReportLeaveRequest['user']) =>
    user?.group_id ? groupMap.get(user.group_id)?.name ?? '—' : '—';

  const getDepartmentName = (user?: ReportLeaveRequest['user']) =>
    user?.department_id ? departmentMap.get(user.department_id)?.name ?? '—' : '—';

  // Statistics grouped by Company
  const perCompanyData = useMemo(() => {
    const map = new Map<string, { name: string; days: number; count: number }>();
    for (const r of requests) {
      const companyId = r.user?.company_id ?? 'unassigned';
      const name = companyId !== 'unassigned' ? (companyMap.get(companyId)?.name ?? 'Unknown') : 'Unassigned';
      const existing = map.get(companyId) ?? { name, days: 0, count: 0 };
      existing.days += r.total_days;
      existing.count += 1;
      map.set(companyId, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.days - a.days);
  }, [requests, companyMap]);

  // Statistics grouped by Group
  const perGroupData = useMemo(() => {
    const map = new Map<string, { name: string; days: number; count: number }>();
    for (const r of requests) {
      const groupId = r.user?.group_id ?? 'unassigned';
      const name = groupId !== 'unassigned' ? (groupMap.get(groupId)?.name ?? 'Unknown') : 'Unassigned';
      const existing = map.get(groupId) ?? { name, days: 0, count: 0 };
      existing.days += r.total_days;
      existing.count += 1;
      map.set(groupId, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.days - a.days);
  }, [requests, groupMap]);

  // Statistics grouped by Department
  const perDepartmentData = useMemo(() => {
    const map = new Map<string, { name: string; days: number; count: number }>();
    for (const r of requests) {
      const deptId = r.user?.department_id ?? 'unassigned';
      const name = deptId !== 'unassigned' ? (departmentMap.get(deptId)?.name ?? 'Unknown') : 'Unassigned';
      const existing = map.get(deptId) ?? { name, days: 0, count: 0 };
      existing.days += r.total_days;
      existing.count += 1;
      map.set(deptId, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.days - a.days);
  }, [requests, departmentMap]);

  // Per leave type data
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

  const PIE_COLORS = ['#818CF8', '#FCA5A5', '#4ADE80', '#FCD34D', '#FB923C', '#A78BFA', '#6EE7B7', '#FECACA'];

  // Paginated requests for table
  const paginatedRequests = useMemo(() => {
    const start = page * rowsPerPage;
    return requests.slice(start, start + rowsPerPage);
  }, [requests, page, rowsPerPage]);

  const handleExportCSV = () => {
    const headers = ['Employee', 'Company', 'Group', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Total Days', 'Status', 'Reason'];
    const rows = requests.map((r) => [
      r.user?.full_name ?? '',
      getCompanyName(r.user),
      getGroupName(r.user),
      getDepartmentName(r.user),
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
    link.download = `admin-leave-report-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  if (loading && requests.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const totalDays = requests.reduce((sum, r) => sum + r.total_days, 0);
  const uniqueEmployees = new Set(requests.map((r) => r.user_id)).size;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment color="primary" />
          <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 600 }}>
            Admin Leave Reports
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

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
          <Button onClick={fetchReportData} sx={{ ml: 2 }}>Retry</Button>
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <FilterList color="action" />
          <Typography variant="subtitle2">Filters</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
            slotProps={{ inputLabel: { shrink: true } }}
            size="small"
          />
          <TextField
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
            slotProps={{ inputLabel: { shrink: true } }}
            size="small"
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Company</InputLabel>
            <Select
              value={selectedCompanyId}
              label="Company"
              onChange={(e) => handleCompanyChange(e.target.value)}
            >
              <MenuItem value="">All Companies</MenuItem>
              {companies.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Group</InputLabel>
            <Select
              value={selectedGroupId}
              label="Group"
              onChange={(e) => handleGroupChange(e.target.value)}
            >
              <MenuItem value="">All Groups</MenuItem>
              {filteredGroups.map((g) => (
                <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Department</InputLabel>
            <Select
              value={selectedDepartmentId}
              label="Department"
              onChange={(e) => { setSelectedDepartmentId(e.target.value); setPage(0); }}
            >
              <MenuItem value="">All Departments</MenuItem>
              {filteredDepartments.map((d) => (
                <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
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
            <Typography variant="body2" color="text.secondary">Companies</Typography>
            <Typography variant="h4" color="primary">{perCompanyData.length}</Typography>
          </CardContent>
        </Card>
      </Box>

      {requests.length === 0 ? (
        <Alert severity="info">No leave data found for the selected filters.</Alert>
      ) : (
        <>
          {/* Charts: Usage by Company and Group */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
            <Paper sx={{ p: 3, flex: '1 1 400px' }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Leave Usage by Company
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={perCompanyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="days" name="Days" fill="#FCA5A5" />
                  <Bar dataKey="count" name="Requests" fill="#818CF8" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>

            <Paper sx={{ p: 3, flex: '1 1 400px' }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Leave Usage by Group
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={perGroupData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="days" name="Days" fill="#00C49F" />
                  <Bar dataKey="count" name="Requests" fill="#FFBB28" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Box>

          {/* Charts: Usage by Department and Leave Type */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
            <Paper sx={{ p: 3, flex: '1 1 400px' }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Leave Usage by Department
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={perDepartmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="days" name="Days" fill="#FF8042" />
                  <Bar dataKey="count" name="Requests" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>

            <Paper sx={{ p: 3, flex: '1 1 400px' }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Leave Usage by Type
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
          </Box>

          {/* Leave Requests Table */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Leave Requests
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Employee</strong></TableCell>
                    <TableCell><strong>Company</strong></TableCell>
                    <TableCell><strong>Group</strong></TableCell>
                    <TableCell><strong>Department</strong></TableCell>
                    <TableCell><strong>Leave Type</strong></TableCell>
                    <TableCell><strong>Start</strong></TableCell>
                    <TableCell><strong>End</strong></TableCell>
                    <TableCell><strong>Days</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedRequests.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{r.user?.full_name ?? '—'}</TableCell>
                      <TableCell>{getCompanyName(r.user)}</TableCell>
                      <TableCell>{getGroupName(r.user)}</TableCell>
                      <TableCell>{getDepartmentName(r.user)}</TableCell>
                      <TableCell>
                        <Chip
                          label={r.leave_type?.name ?? '—'}
                          size="small"
                          sx={{
                            bgcolor: r.leave_type?.color_code ?? undefined,
                            color: r.leave_type?.color_code ? '#fff' : undefined,
                          }}
                        />
                      </TableCell>
                      <TableCell>{new Date(r.start_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(r.end_date).toLocaleDateString()}</TableCell>
                      <TableCell>{r.total_days}</TableCell>
                      <TableCell>
                        <Chip
                          label={r.status}
                          size="small"
                          color={statusColor(r.status) as any}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={requests.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </Paper>
        </>
      )}
    </Box>
  );
};

export default AdminReports;
