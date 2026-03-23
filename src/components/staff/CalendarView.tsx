// src/components/staff/CalendarView.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, subMonths, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { RootState, AppDispatch } from '../../store';
import { fetchHolidays, fetchCalendarRequests } from '../../store/slices/leaveSlice';
import { CalendarEvent, LeaveRequest, Holiday } from '../../types';
import ThreeMonthView from '../common/ThreeMonthView';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

const HOLIDAY_COLOR = '#FF6B6B';

const statusColorMap: Record<LeaveRequest['status'], 'warning' | 'success' | 'error' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'default',
};

/** Map approved leave requests to CalendarEvent objects */
function mapLeaveToEvents(requests: LeaveRequest[]): CalendarEvent[] {
  return requests
    .filter((r) => r.status === 'approved')
    .map((r) => {
      const startParts = r.start_date.split('-').map(Number);
      const endParts = r.end_date.split('-').map(Number);
      const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
      const end = new Date(endParts[0], endParts[1] - 1, endParts[2] + 1);
      return {
        id: r.id,
        title: r.leave_type?.name ?? 'Leave',
        start,
        end,
        allDay: true,
        resource: {
          type: 'leave' as const,
          color: r.leave_type?.color_code ?? '#1976d2',
          status: r.status,
        },
      };
    });
}

/** Map holidays to CalendarEvent objects */
function mapHolidaysToEvents(holidays: Holiday[]): CalendarEvent[] {
  return holidays.map((h) => {
    const startParts = h.holiday_date.split('-').map(Number);
    const endStr = h.holiday_end_date || h.holiday_date;
    const endParts = endStr.split('-').map(Number);
    const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    // react-big-calendar end is exclusive, so +1 day
    const end = new Date(endParts[0], endParts[1] - 1, endParts[2] + 1);
    return {
      id: `holiday-${h.id}`,
      title: `🎉 ${h.name}`,
      start,
      end,
      allDay: true,
      resource: {
        type: 'holiday' as const,
        color: HOLIDAY_COLOR,
      },
    };
  });
}

/** Legend showing leave type color mapping */
const CalendarLegend: React.FC<{ leaveTypes: { name: string; color: string }[] }> = ({
  leaveTypes,
}) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
    {leaveTypes.map((lt) => (
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
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box
        sx={{
          width: 14,
          height: 14,
          borderRadius: '3px',
          backgroundColor: HOLIDAY_COLOR,
          border: '1px dashed #c0392b',
        }}
      />
      <Typography variant="caption">Holiday</Typography>
    </Box>
  </Box>
);

const CalendarView: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { requests, holidays, loading, error } = useSelector(
    (state: RootState) => state.leave,
  );

  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | '3months'>('calendar');

  // Helper to fetch calendar requests for a date range with 1-month buffer
  const fetchForRange = useCallback(
    (rangeStart: Date, rangeEnd: Date) => {
      if (!user) return;
      const bufferedStart = subMonths(rangeStart, 1);
      const bufferedEnd = addMonths(rangeEnd, 1);
      const startDate = format(bufferedStart, 'yyyy-MM-dd');
      const endDate = format(bufferedEnd, 'yyyy-MM-dd');
      dispatch(fetchCalendarRequests({ userId: user.id, startDate, endDate }));
    },
    [dispatch, user],
  );

  // Fetch data on mount — visible month + 1 month buffer
  useEffect(() => {
    if (user) {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      fetchForRange(monthStart, monthEnd);
      dispatch(fetchHolidays(user?.company_id));
    }
  }, [dispatch, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build calendar events
  const events = useMemo<CalendarEvent[]>(() => {
    const leaveEvents = mapLeaveToEvents(requests);
    const holidayEvents = mapHolidaysToEvents(holidays);
    return [...leaveEvents, ...holidayEvents];
  }, [requests, holidays]);

  // Derive unique leave types for legend
  const legendItems = useMemo(() => {
    const seen = new Map<string, string>();
    requests
      .filter((r) => r.status === 'approved' && r.leave_type)
      .forEach((r) => {
        if (r.leave_type && !seen.has(r.leave_type.name)) {
          seen.set(r.leave_type.name, r.leave_type.color_code);
        }
      });
    return Array.from(seen.entries()).map(([name, color]) => ({ name, color }));
  }, [requests]);

  // Style events by their resource color
  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const isHoliday = event.resource.type === 'holiday';
    return {
      style: {
        backgroundColor: event.resource.color,
        color: '#fff',
        borderRadius: '4px',
        border: isHoliday ? '1px dashed #c0392b' : 'none',
        opacity: isHoliday ? 0.85 : 1,
        fontSize: '0.8rem',
      },
    };
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
  }, []);

  const handleRangeChange = useCallback(
    (range: Date[] | { start: Date; end: Date }) => {
      // Fetch only visible range + 1 month buffer (Req 17.2)
      if (Array.isArray(range)) {
        // Week/day view returns an array of dates
        const rangeStart = range[0];
        const rangeEnd = range[range.length - 1];
        fetchForRange(rangeStart, rangeEnd);
      } else {
        // Month view returns { start, end }
        fetchForRange(range.start, range.end);
      }
    },
    [fetchForRange],
  );

  // Find the original leave request for the detail dialog
  const selectedLeaveRequest = useMemo(() => {
    if (!selectedEvent || selectedEvent.resource.type !== 'leave') return null;
    return requests.find((r) => r.id === selectedEvent.id) ?? null;
  }, [selectedEvent, requests]);

  const selectedHoliday = useMemo(() => {
    if (!selectedEvent || selectedEvent.resource.type !== 'holiday') return null;
    const holidayId = selectedEvent.id.replace('holiday-', '');
    return holidays.find((h) => h.id === holidayId) ?? null;
  }, [selectedEvent, holidays]);

  if (loading && requests.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 600, mb: 3 }}>
        Calendar
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <CalendarLegend leaveTypes={legendItems} />

      {/* View mode toggle */}
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
            onRangeChange={handleRangeChange}
            eventPropGetter={eventPropGetter}
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
        />
      )}

      {/* Leave Request Detail Dialog */}
      <Dialog
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedEvent && selectedEvent.resource.type === 'leave' && selectedLeaveRequest && (
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
                {selectedLeaveRequest.approval_comment && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Approval Comment
                    </Typography>
                    <Typography variant="body2">
                      {selectedLeaveRequest.approval_comment}
                    </Typography>
                  </Box>
                )}
              </Box>
            </DialogContent>
          </>
        )}

        {selectedEvent && selectedEvent.resource.type === 'holiday' && selectedHoliday && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              🎉 {selectedHoliday.name}
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Date
                  </Typography>
                  <Typography variant="body2">
                    {new Date(selectedHoliday.holiday_date).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Typography>
                </Box>
                {selectedHoliday.description && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Description
                    </Typography>
                    <Typography variant="body2">{selectedHoliday.description}</Typography>
                  </Box>
                )}
                {selectedHoliday.is_recurring && (
                  <Chip label="Recurring" size="small" color="info" />
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

export default CalendarView;
