// src/components/manager/TeamView/index.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Autocomplete,
  TextField,
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

import { RootState } from '../../../store';
import { supabase } from '../../../config/supabase';
import { CalendarEvent, LeaveRequest, User } from '../../../types';
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

const statusColorMap: Record<LeaveRequest['status'], 'warning' | 'success' | 'error' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'default',
};

/** Detect conflict dates where 2+ team members have overlapping leave */
function detectConflictDates(requests: LeaveRequest[]): Set<string> {
  const dateUserMap = new Map<string, Set<string>>();

  for (const r of requests) {
    if (r.status !== 'approved' && r.status !== 'pending') continue;
    const start = parseISO(r.start_date);
    const end = parseISO(r.end_date);
    const days = eachDayOfInterval({ start, end });
    for (const day of days) {
      const key = format(day, 'yyyy-MM-dd');
      if (!dateUserMap.has(key)) {
        dateUserMap.set(key, new Set());
      }
      dateUserMap.get(key)!.add(r.user_id);
    }
  }

  const conflicts = new Set<string>();
  dateUserMap.forEach((users, dateKey) => {
    if (users.size >= 2) {
      conflicts.add(dateKey);
    }
  });
  return conflicts;
}

/** Map team leave requests to CalendarEvent objects */
function mapTeamLeaveToEvents(requests: LeaveRequest[]): CalendarEvent[] {
  return requests
    .filter((r) => r.status === 'approved' || r.status === 'pending')
    .map((r) => {
      const sp = r.start_date.split('-').map(Number);
      const ep = r.end_date.split('-').map(Number);
      const userName = r.user?.full_name ?? 'Team Member';
      const leaveTypeName = r.leave_type?.name ?? 'Leave';
      return {
        id: r.id,
        title: `${userName} – ${leaveTypeName}`,
        start: new Date(sp[0], sp[1] - 1, sp[2]),
        end: new Date(ep[0], ep[1] - 1, ep[2] + 1),
        allDay: true,
        resource: {
          type: 'leave' as const,
          color: r.leave_type?.color_code ?? '#1976d2',
          status: r.status,
        },
      };
    });
}

const TeamView: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [teamRequests, setTeamRequests] = useState<LeaveRequest[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | '3months'>('calendar');

  // Fetch team members and their leave requests
  useEffect(() => {
    if (!user) return;

    const fetchTeamData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch team members assigned to this manager
        const { data: members, error: membersError } = await supabase
          .from('users')
          .select('*')
          .eq('manager_id', user!.id)
          .order('full_name', { ascending: true });

        if (membersError) throw membersError;
        setTeamMembers(members ?? []);

        // Fetch approved and pending leave requests for all team members
        const { data: requests, error: requestsError } = await supabase
          .from('leave_requests')
          .select(`
            *,
            leave_type:leave_type_id (*),
            user:user_id (*)
          `)
          .in('status', ['approved', 'pending'])
          .order('start_date', { ascending: true });

        if (requestsError) throw requestsError;

        // Filter to only team member requests (non-admin, non-manager)
        const memberIds = new Set((members ?? []).map((m: User) => m.id));
        const teamOnly = (requests ?? []).filter((r: LeaveRequest) => memberIds.has(r.user_id));
        setTeamRequests(teamOnly);
      } catch (err: any) {
        setError(err.message || 'Failed to load team data');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [user]);

  // Filter requests by selected team members
  const filteredRequests = useMemo(() => {
    if (selectedMembers.length === 0) return teamRequests;
    const selectedIds = new Set(selectedMembers.map((m) => m.id));
    return teamRequests.filter((r) => selectedIds.has(r.user_id));
  }, [teamRequests, selectedMembers]);

  // Build calendar events
  const events = useMemo(() => mapTeamLeaveToEvents(filteredRequests), [filteredRequests]);

  // Detect conflict dates
  const conflictDates = useMemo(() => detectConflictDates(filteredRequests), [filteredRequests]);

  // Style events — add pending opacity
  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const isPending = event.resource.status === 'pending';
    return {
      style: {
        backgroundColor: event.resource.color,
        color: '#fff',
        borderRadius: '4px',
        border: isPending ? '2px dashed rgba(255,255,255,0.6)' : 'none',
        opacity: isPending ? 0.75 : 1,
        fontSize: '0.8rem',
      },
    };
  }, []);

  // Highlight conflict days with a red background
  const dayPropGetter = useCallback(
    (dateArg: Date) => {
      const key = format(dateArg, 'yyyy-MM-dd');
      if (conflictDates.has(key)) {
        return {
          style: {
            backgroundColor: 'rgba(255, 23, 68, 0.08)',
          },
        };
      }
      return {};
    },
    [conflictDates],
  );

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
  }, []);

  // Find the original leave request for the detail dialog
  const selectedLeaveRequest = useMemo(() => {
    if (!selectedEvent || selectedEvent.resource.type !== 'leave') return null;
    return teamRequests.find((r) => r.id === selectedEvent.id) ?? null;
  }, [selectedEvent, teamRequests]);

  // Derive unique leave types for legend
  const legendItems = useMemo(() => {
    const seen = new Map<string, string>();
    filteredRequests.forEach((r) => {
      if (r.leave_type && !seen.has(r.leave_type.name)) {
        seen.set(r.leave_type.name, r.leave_type.color_code);
      }
    });
    return Array.from(seen.entries()).map(([name, color]) => ({ name, color }));
  }, [filteredRequests]);

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
        Team View
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Team member filter */}
      <Autocomplete
        multiple
        options={teamMembers}
        getOptionLabel={(option) => option.full_name}
        value={selectedMembers}
        onChange={(_, newValue) => setSelectedMembers(newValue)}
        renderInput={(params) => (
          <TextField {...params} label="Filter by team member" placeholder="Select members" />
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const { key, ...tagProps } = getTagProps({ index });
            return <Chip key={key} label={option.full_name} size="small" {...tagProps} />;
          })
        }
        sx={{ mb: 2, width: '100%', maxWidth: 600 }}
      />

      {/* Legend */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center' }}>
        {legendItems.map((lt) => (
          <Box key={lt.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 14,
                height: 14,
                borderRadius: '3px',
                backgroundColor: lt.color,
              }}
            />
            <Typography variant="caption">{lt.name}</Typography>
          </Box>
        ))}
        {conflictDates.size > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 14,
                height: 14,
                borderRadius: '3px',
                backgroundColor: 'rgba(255, 23, 68, 0.08)',
                border: `1px solid ${CONFLICT_COLOR}`,
              }}
            />
            <Typography variant="caption">Conflict (2+ members off)</Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: '3px',
              backgroundColor: '#1976d2',
              border: '2px dashed rgba(255,255,255,0.6)',
              opacity: 0.75,
            }}
          />
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

      {/* Leave Request Detail Dialog */}
      <Dialog
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedEvent && selectedLeaveRequest && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: selectedEvent.resource.color,
                }}
              />
              {selectedLeaveRequest.user?.full_name ?? 'Team Member'} –{' '}
              {selectedLeaveRequest.leave_type?.name ?? 'Leave'}
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Box>
                    <Chip
                      label={selectedLeaveRequest.status}
                      color={statusColorMap[selectedLeaveRequest.status]}
                      size="small"
                    />
                  </Box>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Dates
                  </Typography>
                  <Typography variant="body2">
                    {new Date(selectedLeaveRequest.start_date).toLocaleDateString()} –{' '}
                    {new Date(selectedLeaveRequest.end_date).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Days
                  </Typography>
                  <Typography variant="body2">
                    {selectedLeaveRequest.total_days}
                    {selectedLeaveRequest.is_half_day &&
                      ` (Half day – ${selectedLeaveRequest.half_day_period})`}
                  </Typography>
                </Box>
                {selectedLeaveRequest.reason && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Reason
                    </Typography>
                    <Typography variant="body2">{selectedLeaveRequest.reason}</Typography>
                  </Box>
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

export default TeamView;
