// src/components/admin/Settings/index.tsx
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import {
  fetchHierarchyProfile,
  updateHierarchyProfile,
} from '../../../store/slices/organizationSlice';
import { HierarchyProfile } from '../../../types';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Person,
  GroupWork,
  Business,
  Groups,
} from '@mui/icons-material';

const PROFILES: { value: HierarchyProfile; label: string; description: string; icon: React.ReactNode; levels: string }[] = [
  {
    value: 'flat',
    label: 'Flat',
    description: 'No organizational layers. Users belong directly to the company.',
    icon: <Person sx={{ fontSize: 40 }} />,
    levels: 'Company → Users',
  },
  {
    value: 'teams',
    label: 'Teams',
    description: 'Smallest unit only. Good for simple team-based companies.',
    icon: <Groups sx={{ fontSize: 40 }} />,
    levels: 'Company → Teams → Users',
  },
  {
    value: 'departments',
    label: 'Departments',
    description: 'Two levels. Departments contain teams.',
    icon: <Business sx={{ fontSize: 40 }} />,
    levels: 'Company → Departments → Teams → Users',
  },
  {
    value: 'groups',
    label: 'Groups',
    description: 'Full hierarchy. Groups contain departments and teams. For large organizations.',
    icon: <GroupWork sx={{ fontSize: 40 }} />,
    levels: 'Company → Groups → Departments → Teams → Users',
  },
];

const HIERARCHY_ORDER: Record<HierarchyProfile, number> = {
  flat: 0,
  teams: 1,
  departments: 2,
  groups: 3,
};

function getChangeInfo(from: HierarchyProfile, to: HierarchyProfile): { title: string; message: string; steps: string[] } {
  const isUpgrade = HIERARCHY_ORDER[to] > HIERARCHY_ORDER[from];

  if (isUpgrade) {
    const steps: string[] = [];
    if (from === 'flat' && to === 'teams') {
      steps.push('Create teams and assign users to them.');
    } else if (from === 'flat' && to === 'departments') {
      steps.push('Create departments, then create teams within each department.', 'Assign users to the appropriate teams.');
    } else if (from === 'flat' && to === 'groups') {
      steps.push('Create groups, then create departments within each group.', 'Create teams within each department.', 'Assign users to the appropriate teams.');
    } else if (from === 'teams' && to === 'departments') {
      steps.push('Create departments and assign each existing team to a department.');
    } else if (from === 'teams' && to === 'groups') {
      steps.push('Create groups, then create departments within each group.', 'Assign each existing team to a department.');
    } else if (from === 'departments' && to === 'groups') {
      steps.push('Create groups and assign each existing department to a group.');
    }
    return {
      title: 'Upgrade Organization Hierarchy',
      message: `You are upgrading from "${from}" to "${to}". New organizational levels will be added. You will need to:`,
      steps,
    };
  } else {
    const steps: string[] = [];
    steps.push('Upper-level assignments will be removed from child sections.');
    steps.push('Review your organizational structure to ensure everything is correct.');
    return {
      title: 'Downgrade Organization Hierarchy',
      message: `You are downgrading from "${from}" to "${to}". Some organizational levels will no longer be used. Please note:`,
      steps,
    };
  }
}

const Settings: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { hierarchyProfile } = useSelector((state: RootState) => state.organization);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; target: HierarchyProfile | null }>({
    open: false, target: null,
  });

  useEffect(() => {
    if (user?.company_id) {
      dispatch(fetchHierarchyProfile(user.company_id));
    }
  }, [dispatch, user]);

  const handleSelect = (profile: HierarchyProfile) => {
    if (!user?.company_id || profile === hierarchyProfile) return;
    if (hierarchyProfile && HIERARCHY_ORDER[profile] < HIERARCHY_ORDER[hierarchyProfile]) return;
    setConfirmDialog({ open: true, target: profile });
  };

  const handleConfirm = async () => {
    const profile = confirmDialog.target;
    setConfirmDialog({ open: false, target: null });
    if (!user?.company_id || !profile) return;
    try {
      await dispatch(updateHierarchyProfile({ companyId: user.company_id, profile })).unwrap();
      setSnackbar({ open: true, message: `Hierarchy updated to "${profile}"`, severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err || 'Failed to update', severity: 'error' });
    }
  };

  const changeInfo = confirmDialog.target && hierarchyProfile
    ? getChangeInfo(hierarchyProfile, confirmDialog.target)
    : null;

  return (
    <Box>
      <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 600, mb: 1 }}>
        Company Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Choose the organizational hierarchy that fits your company structure.
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {PROFILES.map((p) => {
          const isSelected = hierarchyProfile === p.value;
          const isLower = hierarchyProfile ? HIERARCHY_ORDER[p.value] < HIERARCHY_ORDER[hierarchyProfile] : false;
          return (
            <Card
              key={p.value}
              sx={{
                flex: '1 1 220px',
                minWidth: 220,
                border: isSelected ? 2 : 1,
                borderColor: isSelected ? 'primary.main' : 'divider',
                position: 'relative',
                opacity: isLower ? 0.5 : 1,
              }}
            >
              <CardActionArea
                onClick={() => handleSelect(p.value)}
                disabled={isSelected || isLower}
                sx={{ p: 2, height: '100%' }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box sx={{ color: isSelected ? 'primary.main' : 'text.secondary', mb: 1 }}>
                    {p.icon}
                  </Box>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {p.label}
                    {isSelected && (
                      <Chip label="Active" color="primary" size="small" sx={{ ml: 1 }} />
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {p.description}
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1, bgcolor: 'grey.50' }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {p.levels}
                    </Typography>
                  </Paper>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>

      <Alert severity="info" sx={{ mt: 4 }}>
        You can only upgrade your organization hierarchy. Downgrading is not allowed. Make sure to update the new organizational sections after upgrading.
      </Alert>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled"
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, target: null })}
        maxWidth="sm"
        fullWidth
      >
        {changeInfo && (
          <>
            <DialogTitle>{changeInfo.title}</DialogTitle>
            <DialogContent>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {changeInfo.message}
              </Typography>
              <Box component="ol" sx={{ pl: 2, m: 0 }}>
                {changeInfo.steps.map((step, i) => (
                  <li key={i}>
                    <Typography variant="body2" sx={{ mb: 1 }}>{step}</Typography>
                  </li>
                ))}
              </Box>
              <Alert severity="warning" sx={{ mt: 2 }}>
                This action will change your company's organizational structure. Make sure to update affected sections afterward.
              </Alert>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmDialog({ open: false, target: null })}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} variant="contained" color="primary">
                Confirm Change
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default Settings;
