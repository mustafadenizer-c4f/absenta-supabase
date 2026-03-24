// src/components/staff/LeaveRequest/index.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  CircularProgress,
  Grid,
  Chip,
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { fetchHolidays, createLeaveRequest } from '../../../store/slices/leaveSlice';
import { selectWorkdayConfig } from '../../../store/slices/organizationSlice';
import { supabase } from '../../../config/supabase';
import { LeaveService } from '../../../services/leave';
import { BalanceService } from '../../../services/balance';
import { calculateBusinessDays } from '../../../utils/dateUtils';
import { leaveRequestSchema } from '../../../utils/validation';
import { LeaveType, User, LeaveBalanceSummary } from '../../../types';
import { calculateSeniorityYears } from '../../../utils/entitlementCalculator';

interface LeaveRequestFormData {
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  isHalfDay: boolean;
  halfDayPeriod?: string;
  reason?: string;
  coveringPersonId?: string;
}

function isAnnualLeaveType(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes('yıllık') || lower.includes('annual');
}

const LeaveRequest: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { holidays } = useSelector((state: RootState) => state.leave);
  const workdayConfig = useSelector(selectWorkdayConfig);

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [colleagues, setColleagues] = useState<User[]>([]);
  const [balances, setBalances] = useState<LeaveBalanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [overlapError, setOverlapError] = useState<string | null>(null);
  const [balanceWarning, setBalanceWarning] = useState<string | null>(null);
  const [approverError, setApproverError] = useState<string | null>(null);
  const [seniorityWarning, setSeniorityWarning] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<LeaveRequestFormData>({
    resolver: yupResolver(leaveRequestSchema) as any,
    defaultValues: {
      leaveTypeId: '',
      startDate: new Date(),
      endDate: new Date(),
      isHalfDay: false,
      halfDayPeriod: '',
      reason: '',
      coveringPersonId: '',
    },
  });

  const watchStartDate = watch('startDate');
  const watchEndDate = watch('endDate');
  const watchIsHalfDay = watch('isHalfDay');
  const watchLeaveTypeId = watch('leaveTypeId');

  // Fetch leave types, colleagues, holidays, and balances on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [ltRes, usersRes] = await Promise.all([
          user?.company_id
            ? supabase.from('leave_types').select('*').eq('is_active', true).eq('company_id', user.company_id).order('name')
            : supabase.from('leave_types').select('*').eq('is_active', true).order('name'),
          user?.company_id
            ? supabase.from('users').select('*').eq('company_id', user.company_id).neq('role', 'supervisor').order('full_name')
            : supabase.from('users').select('*').order('full_name'),
        ]);

        if (ltRes.error) throw ltRes.error;
        if (usersRes.error) throw usersRes.error;

        setLeaveTypes(ltRes.data || []);
        // Exclude current user from colleagues list
        setColleagues((usersRes.data || []).filter((u: User) => u.id !== user?.id));

        if (user) {
          const bal = await BalanceService.getBalances(user.id, user.hire_date, user.birth_date || '');
          setBalances(bal);
        }

        dispatch(fetchHolidays(user?.company_id));
      } catch (err: any) {
        setSnackbar({ open: true, message: err.message || 'Failed to load data', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dispatch, user]);

  // Check if user has an assigned approver on mount
  useEffect(() => {
    const checkApprover = async () => {
      if (!user) return;
      try {
        await LeaveService.resolveApprover(user.id);
        setApproverError(null);
      } catch (err: any) {
        setApproverError(err.message || 'No manager assigned. You cannot submit leave requests until a manager is assigned to you.');
      }
    };
    checkApprover();
  }, [user]);

  // When half-day is toggled on, lock end date to start date
  useEffect(() => {
    if (watchIsHalfDay && watchStartDate) {
      setValue('endDate', watchStartDate);
    }
  }, [watchIsHalfDay, watchStartDate, setValue]);

  // Calculate business days in real-time
  const businessDays = useMemo(() => {
    if (!watchStartDate || !watchEndDate) return 0;
    const start = new Date(watchStartDate);
    const end = new Date(watchEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    if (start > end) return 0;
    if (watchIsHalfDay) return 0.5;
    return calculateBusinessDays(start, end, holidays, workdayConfig);
  }, [watchStartDate, watchEndDate, watchIsHalfDay, holidays, workdayConfig]);

  // Check balance warning when leave type or business days change
  useEffect(() => {
    if (!watchLeaveTypeId || businessDays <= 0) {
      setBalanceWarning(null);
      return;
    }
    const balance = balances.find((b) => b.leave_type_id === watchLeaveTypeId);
    if (balance && businessDays > balance.remaining) {
      setBalanceWarning(
        `This request (${businessDays} days) exceeds your remaining balance of ${balance.remaining} days for ${balance.leave_type_name}.`
      );
    } else {
      setBalanceWarning(null);
    }
  }, [watchLeaveTypeId, businessDays, balances]);

  // Check seniority when annual leave type is selected
  useEffect(() => {
    if (!watchLeaveTypeId || !user) {
      setSeniorityWarning(null);
      return;
    }
    const selectedType = leaveTypes.find((lt) => lt.id === watchLeaveTypeId);
    if (!selectedType || !isAnnualLeaveType(selectedType.name)) {
      setSeniorityWarning(null);
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const seniority = calculateSeniorityYears(user.hire_date, today);
    if (seniority < 1) {
      const hire = new Date(user.hire_date);
      const eligibility = new Date(hire);
      eligibility.setFullYear(eligibility.getFullYear() + 1);
      const eligibilityDate = eligibility.toISOString().split('T')[0];
      setSeniorityWarning(
        `Your annual leave entitlement has not started yet. Eligibility date: ${eligibilityDate}`
      );
    } else {
      setSeniorityWarning(null);
    }
  }, [watchLeaveTypeId, leaveTypes, user]);

  const formatDateStr = (d: Date): string => {
    const date = new Date(d);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const onSubmit = async (data: LeaveRequestFormData) => {
    if (!user) return;
    setOverlapError(null);
    setSubmitting(true);

    try {
      // Resolve approver before submission
      let approver: { approverId: string; approverRole: string };
      try {
        approver = await LeaveService.resolveApprover(user.id);
      } catch (approverErr: any) {
        setApproverError(approverErr.message || 'No manager assigned. You cannot submit leave requests.');
        setSubmitting(false);
        return;
      }

      const startStr = formatDateStr(data.startDate);
      const endStr = formatDateStr(data.endDate);

      // Check for overlapping requests
      const overlaps = await LeaveService.checkOverlap(user.id, startStr, endStr);
      if (overlaps.length > 0) {
        const conflict = overlaps[0];
        setOverlapError(
          `Your request overlaps with an existing ${conflict.status} request from ${conflict.start_date} to ${conflict.end_date}.`
        );
        setSubmitting(false);
        return;
      }

      const totalDays = data.isHalfDay ? 0.5 : calculateBusinessDays(new Date(data.startDate), new Date(data.endDate), holidays, workdayConfig);

      const requestData: Record<string, any> = {
        user_id: user.id,
        leave_type_id: data.leaveTypeId,
        start_date: startStr,
        end_date: endStr,
        is_half_day: data.isHalfDay,
        total_days: totalDays,
        status: 'pending',
        approved_by: approver.approverId,
      };

      if (data.isHalfDay && data.halfDayPeriod) {
        requestData.half_day_period = data.halfDayPeriod;
      }
      if (data.reason) {
        requestData.reason = data.reason;
      }
      if (data.coveringPersonId) {
        requestData.covering_person_id = data.coveringPersonId;
      }

      await dispatch(createLeaveRequest(requestData)).unwrap();

      reset();
      setSnackbar({ open: true, message: 'Leave request submitted successfully!', severity: 'success' });
      setTimeout(() => navigate('/staff/history'), 1500);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to submit leave request', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 2 }}>
      <Typography variant="h4" gutterBottom>
        Request Leave
      </Typography>

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={3}>
            {/* Leave Type */}
            <Grid size={12}>
              <Controller
                name="leaveTypeId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    fullWidth
                    label="Leave Type"
                    error={!!errors.leaveTypeId}
                    helperText={errors.leaveTypeId?.message}
                  >
                    {leaveTypes.map((lt) => (
                      <MenuItem key={lt.id} value={lt.id}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: lt.color_code,
                            }}
                          />
                          {lt.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Start Date */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    label="Start Date"
                    type="date"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={field.value ? formatDateStr(field.value) : ''}
                    onChange={(e) => field.onChange(new Date(e.target.value + 'T00:00:00'))}
                    error={!!errors.startDate}
                    helperText={errors.startDate?.message}
                  />
                )}
              />
            </Grid>

            {/* End Date */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="endDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    label="End Date"
                    type="date"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={field.value ? formatDateStr(field.value) : ''}
                    onChange={(e) => field.onChange(new Date(e.target.value + 'T00:00:00'))}
                    error={!!errors.endDate}
                    helperText={errors.endDate?.message}
                    disabled={watchIsHalfDay}
                  />
                )}
              />
            </Grid>

            {/* Business Days Display */}
            <Grid size={12}>
              <Chip
                label={`Business days: ${businessDays}`}
                color={businessDays > 0 ? 'primary' : 'default'}
                variant="outlined"
              />
            </Grid>

            {/* Half-Day Toggle */}
            <Grid size={12}>
              <Controller
                name="isHalfDay"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label="Half-day request"
                  />
                )}
              />
            </Grid>

            {/* Half-Day Period Selector */}
            {watchIsHalfDay && (
              <Grid size={12}>
                <Controller
                  name="halfDayPeriod"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="Half-Day Period"
                      error={!!errors.halfDayPeriod}
                      helperText={errors.halfDayPeriod?.message}
                    >
                      <MenuItem value="morning">Morning</MenuItem>
                      <MenuItem value="afternoon">Afternoon</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>
            )}

            {/* Covering Person */}
            <Grid size={12}>
              <Controller
                name="coveringPersonId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    fullWidth
                    label="Covering Person (Optional)"
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {colleagues.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.full_name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Reason */}
            <Grid size={12}>
              <Controller
                name="reason"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    rows={3}
                    label="Reason (Optional)"
                    error={!!errors.reason}
                    helperText={
                      errors.reason?.message ||
                      `${(field.value || '').length}/500 characters`
                    }
                    slotProps={{ htmlInput: { maxLength: 500 } }}
                  />
                )}
              />
            </Grid>

            {/* Approver Error */}
            {approverError && (
              <Grid size={12}>
                <Alert severity="error">{approverError}</Alert>
              </Grid>
            )}

            {/* Balance Warning */}
            {balanceWarning && (
              <Grid size={12}>
                <Alert severity="warning">{balanceWarning}</Alert>
              </Grid>
            )}

            {/* Seniority Warning */}
            {seniorityWarning && (
              <Grid size={12}>
                <Alert severity="warning">{seniorityWarning}</Alert>
              </Grid>
            )}

            {/* Overlap Error */}
            {overlapError && (
              <Grid size={12}>
                <Alert severity="error">{overlapError}</Alert>
              </Grid>
            )}

            {/* Submit */}
            <Grid size={12}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={submitting || !!approverError || !!seniorityWarning}
                startIcon={submitting ? <CircularProgress size={20} /> : undefined}
              >
                {submitting ? 'Submitting...' : 'Submit Leave Request'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LeaveRequest;
