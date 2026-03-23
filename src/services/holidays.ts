// src/services/holidays.ts
import { supabase } from '../config/supabase';

export const HolidaysService = {
  async getAll(companyId?: string) {
    let query = supabase
      .from('holidays')
      .select('*')
      .order('holiday_date', { ascending: true });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  async create(holidayData: any) {
    const { data, error } = await supabase
      .from('holidays')
      .insert(holidayData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, holidayData: any) {
    const { data, error } = await supabase
      .from('holidays')
      .update(holidayData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('holidays')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
