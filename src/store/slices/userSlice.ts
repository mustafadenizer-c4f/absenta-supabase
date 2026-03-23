// src/store/slices/userSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../config/supabase';

interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  hire_date: string;
  role: string;
  company_id?: string;
  group_id?: string;
  department_id?: string;
  team_id?: string;
  manager_id?: string;
  requires_password_change: boolean;
  created_at: string;
  updated_at: string;
}

interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  users: [],
  loading: false,
  error: null,
};

export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (companyId: string | undefined) => {
    let query = supabase
      .from('users')
      .select('*')
      .order('full_name', { ascending: true });
    
    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return data as User[];
  }
);

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    resetUserState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch users';
      });
  },
});

export const { resetUserState } = userSlice.actions;
export default userSlice.reducer;