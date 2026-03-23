// src/components/profile/ProfilePage.tsx
import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Chip,
  Alert,
  Snackbar,
  Divider,
  Grid,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  CalendarToday,
  Visibility,
  VisibilityOff,
  Save,
  Lock,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { RootState, AppDispatch } from '../../store';
import { passwordResetSchema } from '../../utils/validation';
import { UsersService } from '../../services/users';
import { supabase } from '../../config/supabase';
import { checkSession } from '../../store/slices/authSlice';

interface ProfileFormData {
  full_name: string;
  phone: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const profileSchema = yup.object({
  full_name: yup.string().required('Full name is required'),
  phone: yup.string().default(''),
});

const ProfilePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);

  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isDirty: isProfileDirty },
  } = useForm<ProfileFormData>({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      phone: user?.phone || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
  } = useForm<PasswordFormData>({
    resolver: yupResolver(passwordResetSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    setProfileLoading(true);
    try {
      await UsersService.update(user.id, {
        full_name: data.full_name,
        phone: data.phone || null,
      });
      // Refresh session to get updated user data
      await dispatch(checkSession());
      setSnackbar({ open: true, message: 'Profile updated successfully', severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to update profile', severity: 'error' });
    } finally {
      setProfileLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setPasswordLoading(true);
    try {
      // Verify current password by attempting sign-in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: data.currentPassword,
      });
      if (signInError) {
        setSnackbar({ open: true, message: 'Current password is incorrect', severity: 'error' });
        setPasswordLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });
      if (updateError) throw updateError;

      resetPasswordForm();
      setSnackbar({ open: true, message: 'Password changed successfully', severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to change password', severity: 'error' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const getRoleBadges = () => {
    const badges: { label: string; color: 'primary' | 'secondary' | 'warning' }[] = [];
    const role = user?.role;
    if (role === 'admin') badges.push({ label: 'Admin', color: 'secondary' });
    else if (role === 'department_manager') badges.push({ label: 'Department Manager', color: 'warning' });
    else if (role === 'group_manager') badges.push({ label: 'Group Manager', color: 'warning' });
    else if (role === 'manager') badges.push({ label: 'Manager', color: 'warning' });
    else badges.push({ label: 'Staff', color: 'primary' });
    return badges;
  };

  if (!user) return null;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        My Profile
      </Typography>

      {/* User Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Person sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Personal Information</Typography>
            <Box sx={{ ml: 2, display: 'flex', gap: 1 }}>
              {getRoleBadges().map((badge) => (
                <Chip key={badge.label} label={badge.label} color={badge.color} size="small" />
              ))}
            </Box>
          </Box>
          <Divider sx={{ mb: 3 }} />

          {/* Read-only fields */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Email"
                value={user.email}
                disabled
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Hire Date"
                value={user.hire_date ? new Date(user.hire_date).toLocaleDateString() : 'N/A'}
                disabled
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarToday fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          {/* Editable fields */}
          <Box component="form" onSubmit={handleProfileSubmit(onProfileSubmit)}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Full Name"
                  {...registerProfile('full_name')}
                  error={!!profileErrors.full_name}
                  helperText={profileErrors.full_name?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Phone"
                  {...registerProfile('phone')}
                  error={!!profileErrors.phone}
                  helperText={profileErrors.phone?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Save />}
                disabled={profileLoading || !isProfileDirty}
              >
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Lock sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Change Password</Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Alert severity="info" sx={{ mb: 3 }}>
            Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number.
          </Alert>

          <Box component="form" onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Current Password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  {...registerPassword('currentPassword')}
                  error={!!passwordErrors.currentPassword}
                  helperText={passwordErrors.currentPassword?.message}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle current password visibility"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          edge="end"
                        >
                          {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  {...registerPassword('newPassword')}
                  error={!!passwordErrors.newPassword}
                  helperText={passwordErrors.newPassword?.message}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle new password visibility"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          edge="end"
                        >
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...registerPassword('confirmPassword')}
                  error={!!passwordErrors.confirmPassword}
                  helperText={passwordErrors.confirmPassword?.message}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle confirm password visibility"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                color="warning"
                startIcon={<Lock />}
                disabled={passwordLoading}
              >
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProfilePage;
