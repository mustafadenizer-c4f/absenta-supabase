// src/components/auth/FirstTimeLogin.tsx
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { resetPassword, logout } from '../../store/slices/authSlice';
import { RootState, AppDispatch } from '../../store';
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  Paper,
} from '@mui/material';
import { Visibility, VisibilityOff, LockReset } from '@mui/icons-material';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

interface ResetPasswordFormInputs {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const schema = yup.object({
  currentPassword: yup
    .string()
    .required('Current password is required')
    .min(8, 'Password must be at least 8 characters'),
  newPassword: yup
    .string()
    .required('New password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('newPassword')], 'Passwords must match'),
}).required();

const FirstTimeLogin: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user, isLoading, error } = useSelector((state: RootState) => state.auth);
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordFormInputs>({
    resolver: yupResolver(schema),
    defaultValues: {
      currentPassword: 'Pp123456',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit: SubmitHandler<ResetPasswordFormInputs> = async (data) => {
    if (!user?.email) return;
    
    const result = await dispatch(resetPassword({
      email: user.email,
      newPassword: data.newPassword
    }));
    
    if (resetPassword.fulfilled.match(result)) {
      // Navigate to dashboard after successful password reset
      navigate('/', { replace: true });
    }
  };

  const handleTogglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    switch (field) {
      case 'current':
        setShowCurrentPassword(!showCurrentPassword);
        break;
      case 'new':
        setShowNewPassword(!showNewPassword);
        break;
      case 'confirm':
        setShowConfirmPassword(!showConfirmPassword);
        break;
    }
  };

  // If user doesn't need password change, redirect to dashboard
  if (user && !user.requires_password_change) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4,
        }}
      >
        <Card sx={{ width: '100%', boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: 'primary.main',
                    color: 'white',
                    borderRadius: '50%',
                  }}
                >
                  <LockReset fontSize="large" />
                </Paper>
              </Box>
              <Typography
                component="h1"
                variant="h5"
                sx={{ color: 'primary.main', fontWeight: 600 }}
              >
                First Time Login
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                You must change your password before continuing
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                For security reasons, please change your default password to a secure one.
                Your new password must be at least 8 characters long and contain uppercase,
                lowercase letters, and numbers.
              </Typography>
            </Alert>

            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Current Password (Default: Pp123456)"
                type={showCurrentPassword ? 'text' : 'password'}
                {...register('currentPassword')}
                error={!!errors.currentPassword}
                helperText={errors.currentPassword?.message}
                disabled={isLoading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle current password visibility"
                        onClick={() => handleTogglePasswordVisibility('current')}
                        edge="end"
                      >
                        {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                label="New Password"
                type={showNewPassword ? 'text' : 'password'}
                {...register('newPassword')}
                error={!!errors.newPassword}
                helperText={errors.newPassword?.message}
                disabled={isLoading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle new password visibility"
                        onClick={() => handleTogglePasswordVisibility('new')}
                        edge="end"
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
                disabled={isLoading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle confirm password visibility"
                        onClick={() => handleTogglePasswordVisibility('confirm')}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ mt: 3, mb: 2 }}>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  Password strength:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {['Must contain at least 8 characters', 'Must contain uppercase letter', 'Must contain lowercase letter', 'Must contain number'].map((req, index) => (
                    <Paper
                      key={index}
                      sx={{
                        p: 1,
                        flex: 1,
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        bgcolor: 'background.default',
                      }}
                    >
                      {req}
                    </Paper>
                  ))}
                </Box>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2, mb: 2, py: 1.5 }}
                disabled={isLoading}
              >
                {isLoading ? 'Updating Password...' : 'Update Password & Continue'}
              </Button>
            </Box>

            <Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: 'center' }}>
              After updating your password, you'll be redirected to the dashboard.
            </Typography>

            <Button
              fullWidth
              variant="text"
              color="secondary"
              sx={{ mt: 1 }}
              onClick={async () => {
                await dispatch(logout());
                navigate('/login', { replace: true });
              }}
              disabled={isLoading}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default FirstTimeLogin;