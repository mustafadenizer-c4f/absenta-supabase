// src/components/admin/TeamCalendar/index.tsx — Admin company-wide team calendar
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

import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { supabase } from '../../../config/supabase';
import { CalendarEvent, LeaveRequest, User, Holiday } from '../../../types';
import ThreeMonthView from '../../common/ThreeMonthView';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format, parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay, locales,
});

const CONFLICT_COLOR = '#FF1744';
const HOLIDAY_COLOR = '#4CAF50';

const statusColorMap: Record<LeaveRequest['status'], 'warning' | 'success' | 'error' | 'default'> = {
  pending: 'warning', approved: 'success', rejected: 'error', cancelled: 'default',
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
  dateUserMap.forEach((users, k) => { if (users.size >= 2) conflicts.add(k); });
  return conflicts;
}

function mapLeaveToEvents(requests: LeaveRequest[]): CalendarEvent[] {
  return requests
    .filter((r) => r.status === 'approved' || r.status === 'pending')
    .map((r) => {
      const sp = r.start_date.split('-').map(Number);
      const ep = r.end_date.split('-').map(Number);
      return {
        id: r.id,
        title: `${r.user?.full_name ?? 'Employee'} – ${r.leave_type?.name ?? 'Leave'}`,
        start: new Date(sp[0], sp[1] - 1, sp[2]),
        end: new Date(ep[0], ep[1] - 1, ep[2] + 1),
        allDay: true,
        resource: { type: 'leave' as const, color: r.leave_type?.color_code ?? '#1976d2', status: r.status },
      };
    });
}

function mapHolidaysToEvents(holidays: Holiday[]): CalendarEvent[] {
  return holidays.map((h) => {
    const sp = h.holiday_date.split('-').map(Number);
    const endStr = h.holiday_end_date || h.holiday_date;
    const ep = endStr.split('-').map(Number);
    return {
      id: h.id,
      title: `🎉 ${h.name}`,
      start: new Date(sp[0], sp[1] - 1, sp[2]),
      end: new Date(ep[0], ep[1] - 1, ep[2] + 1),
      allDay: true,
      resource: { type: 'holiday' as const, color: HOLIDAY_COLOR },
    };
  });
}

const AdminTeamCalendar: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | '3months'>('calendar');

  useEffect(() => {
    if (!user?.company_id) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: usersData, error: uErr } = await supabase
          .from('users').select('*').eq('company_id', user.company_id!).order('full_name');
        if (uErr) throw uErr;
        setMembers(usersData ?? []);

        // Fetch teams for this company
        const { data: teamData, error: tErr } = await supabase
          .from('teams').select('id, name').eq('company_id', user.company_id!).order('name');
        if (tErr) throw tErr;
        setTeams(teamData ?? []);

        const memberIds = (usersData ?? []).map((u: User) => u.id);
        if (memberIds.length > 0) {
          const { data: reqData, error: rErr } = await supabase
            .from('leave_requests')
            .select('*, leave_type:leave_type_id(*), user:user_id(*)')
            .in('user_id', memberIds)
            .in('status', ['approved', 'pending'])
            .order('start_date');
          if (rErr) throw rErr;
          setLeaveRequests(reqData ?? []);
        }

        const { data: holData, error: hErr } = await supabase
          .from('holidays').select('*').eq('company_id', user.company_id!).order('holiday_date');
        if (hErr) throw hErr;
        setHolidays(holData ?? []);
      } catch (err: any) {
        setError(err.message || 'Failed to load calendar data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const teamFilteredMembers = useMemo(() => {
    if (!selectedTeam) return members;
    return members.filter((m) => m.team_id === selectedTeam);
  }, [members, selectedTeam]);

  const filteredRequests = useMemo(() => {
    const baseMembers = selectedTeam ? teamFilteredMembers : members;
    const memberIds = new Set(baseMembers.map((m) => m.id));
    let reqs = leaveRequests.filter((r) => memberIds.has(r.user_id));
    if (selectedMembers.length > 0) {
      const selectedIds = new Set(selectedMembers.map((m) => m.id));
      reqs = reqs.filter((r) => selectedIds.has(r.user_id));
    }
    return reqs;
  }, [leaveRequests, members, teamFilteredMembers, selectedTeam, selectedMembers]);

  const leaveEvents = useMemo(() => mapLeaveToEvents(filteredRequests), [filteredRequests]);
  const holidayEvents = useMemo(() => mapHolidaysToEvents(holidays), [holidays]);
  const events = useMemo(() => [...leaveEvents, ...holidayEvents], [leaveEvents, holidayEvents]);
  const conflictDates = useMemo(() => detectConflictDates(filteredRequests), [filteredRequests]);

  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const isHoliday = event.resource.type === 'holiday';
    const isPending = event.resource.status === 'pending';
    return {
      style: {
        backgroundColor: event.resource.color, color: '#fff', borderRadius: '4px',
        border: isPending ? '2px dashed rgba(255,255,255,0.6)' : 'none',
        opacity: isPending ? 0.75 : 1, fontWeight: isHoliday ? 600 : 400, fontSize: '0.8rem',
      },
    };
  }, []);

  const dayPropGetter = useCallback((d: Date) => {
    const key = format(d, 'yyyy-MM-dd');
    return conflictDates.has(key) ? { style: { backgroundColor: 'rgba(255, 23, 68, 0.08)' } } : {};
  }, [conflictDates]);

  const handleSelectEvent = useCallback((event: CalendarEvent) => setSelectedEvent(event), []);

  const selectedLeaveRequest = useMemo(() => {
    if (!selectedEvent || selectedEvent.resource.type !== 'leave') return null;
    return leaveRequests.find((r) => r.id === selectedEvent.id) ?? null;
  }, [selectedEvent, leaveRequests]);

  const selectedHoliday = useMemo(() => {
    if (!selectedEvent || selectedEvent.resource.type !== 'holiday') return null;
    return holidays.find((h) => h.id === selectedEvent.id) ?? null;
  }, [selectedEvent, holidays]);

  const legendItems = useMemo(() => {
    const seen = new Map<string, string>();
    filteredRequests.forEach((r) => { if (r.leave_type && !seen.has(r.leave_type.name)) seen.set(r.leave_type.name, r.leave_type.color_code); });
    return Array.from(seen.entries()).map(([name, color]) => ({ name, color }));
  }, [filteredRequests]);

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 600, mb: 3 }}>Team Calendar</Typography>
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
          multiple options={teamFilteredMembers} getOptionLabel={(o) => o.full_name}
          value={selectedMembers} onChange={(_, v) => setSelectedMembers(v)}
          renderInput={(params) => <TextField {...params} label="Filter by employee" placeholder="Select employees" size="small" />}
          renderTags={(value, getTagProps) => value.map((o, i) => { const { key, ...tp } = getTagProps({ index: i }); return <Chip key={key} label={o.full_name} size="small" {...tp} />; })}
          sx={{ flex: 1, minWidth: 300 }}
        />
      </Box>

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

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small">
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
          <Calendar<CalendarEvent> localizer={localizer} events={events} startAccessor="start" endAccessor="end"
            views={['month', 'week', 'day']} view={view} date={date} onView={setView} onNavigate={setDate}
            onSelectEvent={handleSelectEvent} eventPropGetter={eventPropGetter} dayPropGetter={dayPropGetter}
            style={{ height: '100%' }} popup />
        </Box>
      ) : (
        <ThreeMonthView date={date} events={events} onSelectEvent={handleSelectEvent} eventPropGetter={eventPropGetter} dayPropGetter={dayPropGetter} />
      )}

      <Dialog open={!!selectedEvent} onClose={() => setSelectedEvent(null)} maxWidth="sm" fullWidth>
        {selectedEvent && selectedLeaveRequest && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: selectedEvent.resource.color }} />
              {selectedLeaveRequest.user?.full_name ?? 'Employee'} – {selectedLeaveRequest.leave_type?.name ?? 'Leave'}
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box><Typography variant="caption" color="text.secondary">Status</Typography><Box><Chip label={selectedLeaveRequest.status} color={statusColorMap[selectedLeaveRequest.status]} size="small" /></Box></Box>
                <Divider />
                <Box><Typography variant="caption" color="text.secondary">Dates</Typography><Typography variant="body2">{new Date(selectedLeaveRequest.start_date).toLocaleDateString()} – {new Date(selectedLeaveRequest.end_date).toLocaleDateString()}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">Total Days</Typography><Typography variant="body2">{selectedLeaveRequest.total_days}{selectedLeaveRequest.is_half_day && ` (Half day – ${selectedLeaveRequest.half_day_period})`}</Typography></Box>
                {selectedLeaveRequest.reason && <Box><Typography variant="caption" color="text.secondary">Reason</Typography><Typography variant="body2">{selectedLeaveRequest.reason}</Typography></Box>}
              </Box>
            </DialogContent>
          </>
        )}
        {selectedEvent && selectedHoliday && (
          <>
            <DialogTitle>🎉 {selectedHoliday.name}</DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box><Typography variant="caption" color="text.secondary">Date</Typography><Typography variant="body2">{new Date(selectedHoliday.holiday_date).toLocaleDateString()}{selectedHoliday.holiday_end_date && selectedHoliday.holiday_end_date !== selectedHoliday.holiday_date && ` – ${new Date(selectedHoliday.holiday_end_date).toLocaleDateString()}`}</Typography></Box>
                {selectedHoliday.description && <Box><Typography variant="caption" color="text.secondary">Description</Typography><Typography variant="body2">{selectedHoliday.description}</Typography></Box>}
                {selectedHoliday.is_recurring && <Chip label="Recurring" size="small" color="info" sx={{ width: 'fit-content' }} />}
              </Box>
            </DialogContent>
          </>
        )}
        <DialogActions><Button onClick={() => setSelectedEvent(null)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminTeamCalendar;
