// src/components/auth/Signup.tsx (Create this file temporarily)
import React, { useState } from 'react';
import { supabase } from '../../config/supabase';
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';

const Signup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Pp123456');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('staff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Create user profile in public.users
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email,
            full_name: fullName,
            role: 'staff',
            requires_password_change: true,
          });

        if (profileError) throw profileError;

        setSuccess(true);
        setEmail('');
        setFullName('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Card sx={{ width: '100%' }}>
          <CardContent>
            <Typography variant="h5" sx={{ mb: 3, textAlign: 'center' }}>
              Create Test User
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                User created successfully! You can now log in with email: {email} and password: Pp123456
              </Alert>
            )}

            <form onSubmit={handleSignup}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                margin="normal"
                required
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Password"
                type="text"
                value={password}
                disabled
                margin="normal"
                helperText="Default password for testing"
              />

              <FormControl fullWidth margin="normal">
                <InputLabel>Role</InputLabel>
                <Select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  label="Role"
                  required
                >
                  <MenuItem value="staff">Staff</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? 'Creating User...' : 'Create Test User'}
              </Button>
            </form>

            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              Note: This is for testing only. In production, admin should create users.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Signup;