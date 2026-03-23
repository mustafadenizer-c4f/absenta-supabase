// src/components/auth/Login.tsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { login, clearError } from '../../store/slices/authSlice';
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
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

interface LoginFormInputs {
  email: string;
  password: string;
}

const schema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: yup
    .string()
    .required('Password is required'),
}).required();

const Login: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { error, user } = useSelector((state: RootState) => state.auth);
  
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: yupResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    // Check for persisted login error (survives re-mount from auth state changes)
    const persisted = sessionStorage.getItem('loginError');
    if (persisted) {
      setLoginError(persisted);
      sessionStorage.removeItem('loginError');
    }
  }, []);

  // Auto-dismiss error after 10 seconds
  useEffect(() => {
    if (!loginError) return;
    const timer = setTimeout(() => {
      setLoginError(null);
      sessionStorage.removeItem('loginError');
    }, 7000);
    return () => clearTimeout(timer);
  }, [loginError]);

  useEffect(() => {
    if (user) {
      sessionStorage.removeItem('loginError');
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const clearLoginError = () => {
    setLoginError(null);
    sessionStorage.removeItem('loginError');
    dispatch(clearError());
  };

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    clearLoginError();
    dispatch(clearError());
    setSubmitting(true);
    const result = await dispatch(login(data));
    setSubmitting(false);
    
    if (login.rejected.match(result)) {
      const msg = result.payload as string;
      setLoginError(msg);
      sessionStorage.setItem('loginError', msg);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container component="main" maxWidth="xs">
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
        <Card sx={{ width: '100%', boxShadow: 'rgb(149 104 189 / 85%) 0px 22px 70px 4px' }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                component="img"
                src={`${process.env.PUBLIC_URL}/logos/logo.png`}
                alt="Absenta"
                sx={{ height: 64, mx: 'auto', mb: 2 }}
              />
              <Typography
                component="h1"
                variant="h5"
                sx={{ fontWeight: 700, color: 'text.primary' }}
              >
                Welcome back
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Sign in to your Absenta account
              </Typography>
            </Box>

            {(loginError || error) && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {loginError || error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit(onSubmit)} onInput={clearLoginError} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                autoComplete="email"
                autoFocus
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
                disabled={submitting}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message}
                disabled={submitting}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  background: 'linear-gradient(135deg, #6366F1 0%, #F87171 100%)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4F46E5 0%, #EF4444 100%)',
                  },
                }}
                disabled={submitting}
              >
                {submitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            © {new Date().getFullYear()} Absenta
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;