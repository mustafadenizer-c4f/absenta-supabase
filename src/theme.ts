// src/theme.ts
import { createTheme, alpha } from '@mui/material/styles';

const FONT = '"Poppins", Helvetica, sans-serif';
const GRADIENT = 'linear-gradient(135deg, #6f72ffff 0%, #F87171 100%)';

const theme = createTheme({
  palette: {
    primary: {
      main: '#818CF8',
      light: '#A5B4FC',
      dark: '#6366F1',
      contrastText: '#fff',
    },
    secondary: {
      main: '#FCA5A5',
      light: '#FECACA',
      dark: '#F87171',
      contrastText: '#fff',
    },
    background: {
      default: '#F5F5FF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#312E51',
      secondary: '#6B6889',
    },
    success: { main: '#4ADE80' },
    warning: { main: '#FCD34D' },
    error: { main: '#FB7185' },
    info: { main: '#818CF8' },
    divider: alpha('#818CF8', 0.08),
  },
  typography: {
    fontFamily: FONT,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600, fontSize: '1.5rem' },
    h5: { fontWeight: 600, fontSize: '1.25rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 500 },
    body1: { fontWeight: 400 },
    body2: { fontWeight: 400, fontSize: '0.875rem' },
    button: { fontWeight: 500 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontFamily: FONT },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: GRADIENT,
          boxShadow: '0 4px 20px rgba(129, 140, 248, 0.15)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 10,
          padding: '8px 20px',
        },
        containedPrimary: {
          background: GRADIENT,
          '&:hover': {
            background: 'linear-gradient(135deg, #4F46E5 0%, #EF4444 100%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(129, 140, 248, 0.08)',
          border: '1px solid rgba(129, 140, 248, 0.06)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: '0 2px 12px rgba(129, 140, 248, 0.08)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(129, 140, 248, 0.08)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          '&:hover': {
            backgroundColor: alpha('#818CF8', 0.06),
          },
          '&.Mui-selected': {
            backgroundColor: alpha('#818CF8', 0.1),
            '&:hover': {
              backgroundColor: alpha('#818CF8', 0.14),
            },
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: '#818CF8',
          minWidth: 36,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 8,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 600,
            color: '#312E51',
            backgroundColor: alpha('#818CF8', 0.04),
            whiteSpace: 'nowrap',
            fontSize: '0.8rem',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '0.85rem',
          padding: '10px 12px',
          '@media (max-width: 600px)': {
            padding: '6px 8px',
            fontSize: '0.75rem',
          },
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          overflowX: 'auto',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#818CF8',
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: '10px !important',
          textTransform: 'none',
          fontWeight: 500,
          '&.Mui-selected': {
            backgroundColor: alpha('#818CF8', 0.12),
            color: '#818CF8',
            '&:hover': {
              backgroundColor: alpha('#818CF8', 0.18),
            },
          },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          background: GRADIENT,
          fontWeight: 600,
        },
      },
    },
  },
});

export default theme;
