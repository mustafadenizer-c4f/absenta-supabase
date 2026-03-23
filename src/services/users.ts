// src/services/users.ts
import { supabase } from '../config/supabase';

export const UsersService = {
  async getAll(companyId?: string) {
    let query = supabase
      .from('users')
      .select('*')
      .order('full_name', { ascending: true });
    
    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  },
  
  async getById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async update(id: string, userData: any) {
    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async delete(id: string) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};