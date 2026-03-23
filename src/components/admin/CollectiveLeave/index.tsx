// src/components/admin/CollectiveLeave/index.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Add, Refresh } from '@mui/icons-material';
import { RootState, AppDispatch } from '../../../store';
import {
  createCollectiveLeaveThunk,
  fetchCollectiveLeaves,
  fetchHolidays,
} from '../../../store/slices/leaveSlice';
import {
  fetchGroups,
  fetchDepartments,
  fetchTeams,
} from '../../../store/slices/organizationSlice';
import { countLeaveDays } from '../../../utils/leaveDayCounter';
import { CollectiveLeave } from '../../../types';
import { supabase } from '../../../config/supabase';

type Scope = 'company' | 'group' | 'department' | 'team';

const scopeLabels: Record<Scope, string> = {
  company: 'Company',
  group: 'Group',
  department: 'Department',
  team: 'Team',
};

const CollectiveLeavePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const collectiveLeaves = useSelector((state: RootState) => state.leave.collectiveLeaves);
  const holidays = useSelector((state: RootState) => state.leave.holidays);
  const loading = useSelector((state: RootState) => state.leave.loading);
  const groups = useSelector((state: RootState) => state.organization.groups);
  const departments = useSelector((state: RootState) => state.organization.departments);
  const teams = useSelector((state: RootState) => state.organization.teams);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scope, setScope] = useState<Scope>('company');
  const [scopeId, setScopeId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [negativeBalanceWarning, setNegativeBalanceWarning] = useState<string[]>([]);

  const companyId = user?.company_id;

  // Fetch collective leaves and holidays on mount
  useEffect(() => {
    if (companyId) {
      dispatch(fetchCollectiveLeaves(companyId));
      dispatch(fetchHolidays(companyId));
      dispatch(fetchGroups(companyId));
      dispatch(fetchDepartments(undefined));
      dispatch(fetchTeams(undefined));
    }
  }, [dispatch, companyId]);

  // When scope is 'company', auto-set scopeId to companyId
  useEffect(() => {
    if (scope === 'company' && companyId) {
      setScopeId(companyId);
    } else {
      setScopeId('');
    }
  }, [scope, companyId]);

  // Calculate working days from the selected date range
  const calculatedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    if (endDate < startDate) return 0;
    return countLeaveDays({ startDate, endDate, holidays });
  }, [startDate, endDate, holidays]);

  // Scope ID options based on selected scope
  const scopeIdOptions = useMemo(() => {
    switch (scope) {
      case 'group':
        return groups.map((g) => ({ id: g.id, name: g.name }));
      case 'department':
        return departments.map((d) => ({ id: d.id, name: d.name }));
      case 'team':
        return teams.map((t) => ({ id: t.id, name: t.name }));
      default:
        return [];
    }
  }, [scope, groups, departments, teams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !user) return;

    setError(null);
    setSuccess(null);
    setNegativeBalanceWarning([]);

    try {
      const result = await dispatch(
        createCollectiveLeaveThunk({
          startDate,
          endDate,
          scope,
          scopeId,
          companyId,
          createdBy: user.id,
        })
      ).unwrap();

      setSuccess(
        `Collective leave created: ${result.totalDays} working days, ${result.affectedEmployees} employees affected.`
      );

      if (result.negativeBalanceEmployees.length > 0) {
        // Resolve employee IDs to full names
        const { data: empData } = await supabase
          .from('users')
          .select('full_name')
          .in('id', result.negativeBalanceEmployees);
        const names = (empData ?? []).map((u: any) => u.full_name);
        setNegativeBalanceWarning(names.length > 0 ? names : result.negativeBalanceEmployees);
      }

      // Reset form
      setStartDate('');
      setEndDate('');
      setScope('company');
      setScopeId(companyId);

      // Refresh the list
      dispatch(fetchCollectiveLeaves(companyId));
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating collective leave.');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 600 }}>
          Collective Leave Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => companyId && dispatch(fetchCollectiveLeaves(companyId))}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {negativeBalanceWarning.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setNegativeBalanceWarning([])}>
          <Typography variant="subtitle2" gutterBottom>
            The following employees have a negative leave balance:
          </Typography>
          <Typography variant="body2">
            {negativeBalanceWarning.length} employee(s) with negative balance: {negativeBalanceWarning.join(', ')}
          </Typography>
        </Alert>
      )}

      {/* Create Collective Leave Form */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Create Collective Leave
        </Typography>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
            <TextField
              label="Start Date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 180 }}
            />
            <TextField
              label="End Date"
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 180 }}
            />
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Scope</InputLabel>
              <Select
                value={scope}
                label="Scope"
                onChange={(e) => setScope(e.target.value as Scope)}
              >
                {(Object.keys(scopeLabels) as Scope[]).map((key) => (
                  <MenuItem key={key} value={key}>
                    {scopeLabels[key]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {scope !== 'company' && (
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Scope Selection</InputLabel>
                <Select
                  value={scopeId}
                  label="Scope Selection"
                  required
                  onChange={(e) => setScopeId(e.target.value)}
                >
                  {scopeIdOptions.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label={`${calculatedDays} working days`}
                color={calculatedDays > 0 ? 'primary' : 'default'}
                variant="outlined"
              />
              <Button
                type="submit"
                variant="contained"
                startIcon={<Add />}
                disabled={loading || calculatedDays === 0 || !scopeId}
              >
                Create
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>

      {/* Collective Leaves Table */}
      <Paper sx={{ mb: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Start</strong></TableCell>
                <TableCell><strong>End</strong></TableCell>
                <TableCell><strong>Total Days</strong></TableCell>
                <TableCell><strong>Scope</strong></TableCell>
                <TableCell><strong>Created</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && collectiveLeaves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Box sx={{ py: 4 }}>
                      <CircularProgress size={32} />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : collectiveLeaves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Box sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No collective leave records found.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                collectiveLeaves.map((cl: CollectiveLeave) => (
                  <TableRow key={cl.id} hover>
                    <TableCell>{formatDate(cl.start_date)}</TableCell>
                    <TableCell>{formatDate(cl.end_date)}</TableCell>
                    <TableCell>
                      <Chip label={`${cl.total_days} days`} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={scopeLabels[cl.scope] || cl.scope}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{formatDateTime(cl.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default CollectiveLeavePage;
