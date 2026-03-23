// src/services/auth.ts
import { supabase } from '../config/supabase';
import { User, LoginCredentials } from '../types';

export class AuthService {
  // Sign in with email and password
  static async signIn(credentials: LoginCredentials) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (authError) throw authError;

      // Get user profile from public.users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user?.id)
        .single();

      if (userError) throw userError;

      // Check company status for non-supervisor users
      if (userData.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('status')
          .eq('id', userData.company_id)
          .single();

        if (companyError) throw companyError;

        if (companyData && companyData.status === false) {
          // Sign out the user in the background — don't await to avoid re-mount race
          supabase.auth.signOut();
          throw new Error('Your company account has been deactivated. Please contact your administrator.');
        }
      }

      return {
        user: userData as User,
        session: authData.session,
      };
    } catch (error: any) {
      const msg = error.message || 'Login failed';
      // Provide user-friendly messages for common Supabase auth errors
      if (msg.includes('Email not confirmed')) {
        throw new Error('Your email has not been confirmed yet. Please contact your administrator.');
      }
      if (msg.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please try again.');
      }
      throw new Error(msg);
    }
  }

  // Sign out
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return true;
    } catch (error: any) {
      throw new Error(error.message || 'Logout failed');
    }
  }

  // Check current session
  static async getCurrentSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) return null;

      // Get user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userError) throw userError;

      return {
        user: userData as User,
        session,
      };
    } catch (error: any) {
      console.error('Session error:', error);
      return null;
    }
  }

  // First-time password reset
  static async resetFirstTimePassword(email: string, newPassword: string) {
    try {
      // First, sign in with temporary password (handled separately)
      // Then update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Mark password as changed in users table
      const { error: updateError } = await supabase
        .from('users')
        .update({ requires_password_change: false })
        .eq('email', email);

      if (updateError) throw updateError;

      return true;
    } catch (error: any) {
      throw new Error(error.message || 'Password reset failed');
    }
  }

  // Check if user needs password change
  static async checkPasswordChangeRequired(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('requires_password_change')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data?.requires_password_change || false;
    } catch (error) {
      console.error('Error checking password change:', error);
      return false;
    }
  }
}