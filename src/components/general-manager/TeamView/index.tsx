// src/components/general-manager/TeamView/index.tsx — Department Manager Team Calendar
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Autocomplete,
  TextField,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, eachDayOfInterval, parseISO, addMonths, subMonths } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../config/supabase';
import { CalendarEvent, LeaveRequest, User, Holiday } from '../../../types';
import ThreeMonthView from '../../common/ThreeMonthView';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

const CONFLICT_COLOR = '#FF1744';
const HOLIDAY_COLOR = '#4CAF50';

const statusColorMap: Record<LeaveRequest['status'], 'warning' | 'success' | 'error' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'default',
};

function detectConflictDates(requests: LeaveRequest[]): Set<string> {
  const dateUserMap = new Map<string, Set<string>>();
  for (const r of requests) {
    if (r.status !== 'approved' && r.status !== 'pending') continue;
    const days = eachDayOfInterval({ start: parseISO(r.start_date), end: parseISO(r.end_date) });
    for (const day of days) {
      const key = format(day, 'yyyy-MM-dd');
      if (!dateUserMap.has(key)) dateUserMap.set(key, new Set());
      dateUserMap.get(key)!.add(r.user_id);
    }
  }
  const conflicts = new Set<string>();
  dateUserMap.forEach((users, dateKey) => { if (users.size >= 2) conflicts.add(dateKey); });
  return conflicts;
}

function mapLeaveToEvents(requests: LeaveRequest[]): CalendarEvent[] {
  return requests
    .filter((r) => r.status === 'approved' || r.status === 'pending')
    .map((r) => {
      const startParts = r.start_date.split('-').map(Number);
      const endParts = r.end_date.split('-').map(Number);
      const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
      const end = new Date(endParts[0], endParts[1] - 1, endParts[2] + 1);
      return {
        id: r.id,
        title: `${r.user?.full_name ?? 'Team Member'} – ${r.leave_type?.name ?? 'Leave'}`,
        start,
        end,
        allDay: true,
        resource: { type: 'leave' as const, color: r.leave_type?.color_code ?? '#1976d2', status: r.status },
      };
    });
}

function mapHolidaysToEvents(holidays: Holiday[]): CalendarEvent[] {
  return holidays.map((h) => {
    // Parse as local dates (append T00:00:00 to avoid UTC offset shifting)
    const startParts = h.holiday_date.split('-').map(Number);
    const endStr = h.holiday_end_date || h.holiday_date;
    const endParts = endStr.split('-').map(Number);
    const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    // react-big-calendar end is exclusive, so +1 day
    const end = new Date(endParts[0], endParts[1] - 1, endParts[2] + 1);
    return {
      id: h.id,
      title: `🎉 ${h.name}`,
      start,
      end,
      allDay: true,
      resource: { type: 'holiday' as const, color: HOLIDAY_COLOR },
    };
  });
}

const DepartmentManagerTeamView: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deptMembers, setDeptMembers] = useState<User[]>([]);
  const [deptRequests, setDeptRequests] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | '3months'>('calendar');

  useEffect(() => {
    if (!user?.department_id) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch users in this department
        const { data: members, error: membersErr } = await supabase
          .from('users')
          .select('*')
          .eq('department_id', user.department_id!)
          .order('full_name');
        if (membersErr) throw membersErr;
        setDeptMembers(members ?? []);

        // Fetch teams in this department
        const { data: teamData, error: teamErr } = await supabase
          .from('teams')
          .select('id, name')
          .eq('department_id', user.department_id!)
          .order('name');
        if (teamErr) throw teamErr;
        setTeams(teamData ?? []);

        // Fetch leave requests for department members
        const memberIds = (members ?? []).map((m: User) => m.id);
        if (memberIds.length > 0) {
          const { data: requests, error: reqErr } = await supabase
            .from('leave_requests')
            .select('*, leave_type:leave_type_id(*), user:user_id(*)')
            .in('user_id', memberIds)
            .in('status', ['approved', 'pending'])
            .order('start_date');
          if (reqErr) throw reqErr;
          setDeptRequests(requests ?? []);
        } else {
          setDeptRequests([]);
        }

        // Fetch company holidays
        let holQuery = supabase
          .from('holidays')
          .select('*')
          .order('holiday_date');
        if (user?.company_id) {
          holQuery = holQuery.eq('company_id', user.company_id);
        }
        const { data: holidayData, error: holErr } = await holQuery;
        if (holErr) throw holErr;
        setHolidays(holidayData ?? []);
      } catch (err: any) {
        setError(err.message || 'Failed to load team calendar data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Members filtered by selected team
  const teamFilteredMembers = useMemo(() => {
    if (!selectedTeam) return deptMembers;
    return deptMembers.filter((m) => m.team_id === selectedTeam);
  }, [deptMembers, selectedTeam]);

  const filteredRequests = useMemo(() => {
    const baseMembers = selectedTeam ? teamFilteredMembers : deptMembers;
    const memberIds = new Set(baseMembers.map((m) => m.id));
    let reqs = deptRequests.filter((r) => memberIds.has(r.user_id));
    if (selectedMembers.length > 0) {
      const selectedIds = new Set(selectedMembers.map((m) => m.id));
      reqs = reqs.filter((r) => selectedIds.has(r.user_id));
    }
    return reqs;
  }, [deptRequests, deptMembers, teamFilteredMembers, selectedTeam, selectedMembers]);

  const leaveEvents = useMemo(() => mapLeaveToEvents(filteredRequests), [filteredRequests]);
  const holidayEvents = useMemo(() => mapHolidaysToEvents(holidays), [holidays]);
  const events = useMemo(() => [...leaveEvents, ...holidayEvents], [leaveEvents, holidayEvents]);

  const conflictDates = useMemo(() => detectConflictDates(filteredRequests), [filteredRequests]);

  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const isHoliday = event.resource.type === 'holiday';
    const isPending = event.resource.status === 'pending';
    return {
      style: {
        backgroundColor: event.resource.color,
        color: '#fff',
        borderRadius: '4px',
        border: isPending ? '2px dashed rgba(255,255,255,0.6)' : 'none',
        opacity: isPending ? 0.75 : 1,
        fontWeight: isHoliday ? 600 : 400,
        fontSize: '0.8rem',
      },
    };
  }, []);

  const dayPropGetter = useCallback(
    (dateArg: Date) => {
      const key = format(dateArg, 'yyyy-MM-dd');
      if (conflictDates.has(key)) {
        return { style: { backgroundColor: 'rgba(255, 23, 68, 0.08)' } };
      }
      return {};
    },
    [conflictDates],
  );

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
  }, []);

  const selectedLeaveRequest = useMemo(() => {
    if (!selectedEvent || selectedEvent.resource.type !== 'leave') return null;
    return deptRequests.find((r) => r.id === selectedEvent.id) ?? null;
  }, [selectedEvent, deptRequests]);

  const selectedHoliday = useMemo(() => {
    if (!selectedEvent || selectedEvent.resource.type !== 'holiday') return null;
    return holidays.find((h) => h.id === selectedEvent.id) ?? null;
  }, [selectedEvent, holidays]);

  const legendItems = useMemo(() => {
    const seen = new Map<string, string>();
    filteredRequests.forEach((r) => {
      if (r.leave_type && !seen.has(r.leave_type.name)) {
        seen.set(r.leave_type.name, r.leave_type.color_code);
      }
    });
    return Array.from(seen.entries()).map(([name, color]) => ({ name, color }));
  }, [filteredRequests]);

  if (!user?.department_id) {
    return (
      <Box>
        <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 600, mb: 3 }}>
          Team Calendar
        </Typography>
        <Alert severity="warning">No department assigned. Please contact an administrator.</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 600, mb: 3 }}>
        Team Calendar
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center' }}>
        {teams.length > 0 && (
          <TextField
            select
            label="Team"
            value={selectedTeam}
            onChange={(e) => { setSelectedTeam(e.target.value); setSelectedMembers([]); }}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All Teams</MenuItem>
            {teams.map((t) => (
              <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
            ))}
          </TextField>
        )}
        <Autocomplete
          multiple
          options={teamFilteredMembers}
          getOptionLabel={(option) => option.full_name}
          value={selectedMembers}
          onChange={(_, newValue) => setSelectedMembers(newValue)}
          renderInput={(params) => (
            <TextField {...params} label="Filter by team member" placeholder="Select members" size="small" />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...tagProps } = getTagProps({ index });
              return <Chip key={key} label={option.full_name} size="small" {...tagProps} />;
            })
          }
          sx={{ flex: 1, minWidth: 300 }}
        />
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center' }}>
        {legendItems.map((lt) => (
          <Box key={lt.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: '3px', backgroundColor: lt.color }} />
            <Typography variant="caption">{lt.name}</Typography>
          </Box>
        ))}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: '3px', backgroundColor: HOLIDAY_COLOR }} />
          <Typography variant="caption">Holiday</Typography>
        </Box>
        {conflictDates.size > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: '3px', backgroundColor: 'rgba(255, 23, 68, 0.08)', border: `1px solid ${CONFLICT_COLOR}` }} />
            <Typography variant="caption">Conflict</Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: '3px', backgroundColor: '#1976d2', border: '2px dashed rgba(255,255,255,0.6)', opacity: 0.75 }} />
          <Typography variant="caption">Pending</Typography>
        </Box>
      </Box>

      {/* Calendar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, val) => val && setViewMode(val)}
          size="small"
        >
          <ToggleButton value="calendar">Calendar</ToggleButton>
          <ToggleButton value="3months">3 Months</ToggleButton>
        </ToggleButtonGroup>

        {viewMode === '3months' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton size="small" onClick={() => setDate((d) => subMonths(d, 1))}><ChevronLeftIcon /></IconButton>
            <IconButton size="small" onClick={() => setDate(new Date())}><TodayIcon /></IconButton>
            <IconButton size="small" onClick={() => setDate((d) => addMonths(d, 1))}><ChevronRightIcon /></IconButton>
          </Box>
        )}
      </Box>

      {viewMode === 'calendar' ? (
        <Box sx={{ height: { xs: 400, sm: 500, md: 600 }, '& .rbc-calendar': { fontFamily: 'inherit' } }}>
          <Calendar<CalendarEvent>
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            views={['month', 'week', 'day']}
            view={view}
            date={date}
            onView={setView}
            onNavigate={setDate}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventPropGetter}
            dayPropGetter={dayPropGetter}
            style={{ height: '100%' }}
            popup
          />
        </Box>
      ) : (
        <ThreeMonthView
          date={date}
          events={events}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventPropGetter}
          dayPropGetter={dayPropGetter}
        />
      )}

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onClose={() => setSelectedEvent(null)} maxWidth="sm" fullWidth>
        {selectedEvent && selectedLeaveRequest && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: selectedEvent.resource.color }} />
              {selectedLeaveRequest.user?.full_name ?? 'Team Member'} – {selectedLeaveRequest.leave_type?.name ?? 'Leave'}
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box><Chip label={selectedLeaveRequest.status} color={statusColorMap[selectedLeaveRequest.status]} size="small" /></Box>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary">Dates</Typography>
                  <Typography variant="body2">
                    {new Date(selectedLeaveRequest.start_date).toLocaleDateString()} – {new Date(selectedLeaveRequest.end_date).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total Days</Typography>
                  <Typography variant="body2">
                    {selectedLeaveRequest.total_days}
                    {selectedLeaveRequest.is_half_day && ` (Half day – ${selectedLeaveRequest.half_day_period})`}
                  </Typography>
                </Box>
                {selectedLeaveRequest.reason && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Reason</Typography>
                    <Typography variant="body2">{selectedLeaveRequest.reason}</Typography>
                  </Box>
                )}
              </Box>
            </DialogContent>
          </>
        )}
        {selectedEvent && selectedHoliday && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: HOLIDAY_COLOR }} />
              🎉 {selectedHoliday.name}
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Date</Typography>
                  <Typography variant="body2">
                    {new Date(selectedHoliday.holiday_date).toLocaleDateString()}
                    {selectedHoliday.holiday_end_date && selectedHoliday.holiday_end_date !== selectedHoliday.holiday_date &&
                      ` – ${new Date(selectedHoliday.holiday_end_date).toLocaleDateString()}`}
                  </Typography>
                </Box>
                {selectedHoliday.description && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Description</Typography>
                    <Typography variant="body2">{selectedHoliday.description}</Typography>
                  </Box>
                )}
                {selectedHoliday.is_recurring && (
                  <Chip label="Recurring" size="small" color="info" sx={{ width: 'fit-content' }} />
                )}
              </Box>
            </DialogContent>
          </>
        )}
        <DialogActions>
          <Button onClick={() => setSelectedEvent(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DepartmentManagerTeamView;
