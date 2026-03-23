// src/components/common/ThreeMonthView.tsx — Shared 3-month calendar panel (responsive)
import React from 'react';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, subMonths } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

interface ThreeMonthViewProps {
  date: Date;
  events: any[];
  onSelectEvent?: (event: any) => void;
  eventPropGetter?: (event: any) => any;
  dayPropGetter?: (date: Date) => any;
}

const ThreeMonthView: React.FC<ThreeMonthViewProps> = ({
  date,
  events,
  onSelectEvent,
  eventPropGetter,
  dayPropGetter,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const months = [subMonths(date, 1), date, addMonths(date, 1)];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 1,
        '& .rbc-calendar': { fontFamily: 'inherit' },
      }}
    >
      {months.map((monthDate, idx) => (
        <Box key={idx} sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" align="center" sx={{ mb: 0.5, fontWeight: 600 }}>
            {format(monthDate, 'MMMM yyyy')}
          </Typography>
          <Calendar
            localizer={localizer}
            events={events}
            date={monthDate}
            view="month"
            views={['month']}
            toolbar={false}
            onNavigate={() => {}}
            onSelectEvent={onSelectEvent}
            eventPropGetter={eventPropGetter}
            dayPropGetter={dayPropGetter}
            startAccessor="start"
            endAccessor="end"
            style={{ height: isMobile ? 320 : 420 }}
            popup
          />
        </Box>
      ))}
    </Box>
  );
};

export default ThreeMonthView;
