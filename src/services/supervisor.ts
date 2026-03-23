// src/services/supervisor.ts
import { supabase } from '../config/supabase';
import { Company, CompanyWithAdmin, HierarchyProfile } from '../types';

interface CreateCompanyRequest {
  name: string;
  hierarchy_profile: HierarchyProfile;
  phone: string;
  contact_email: string;
  contract_number: string;
}

export const SupervisorService = {
  async createCompanyWithAdmin(data: CreateCompanyRequest): Promise<{ company: Company; admin_user_id: string }> {
    const { data: result, error } = await supabase.functions.invoke('create-company', {
      body: data,
    });
    if (error) throw new Error(error.message || 'Failed to create company');
    if (result?.error) throw new Error(result.error);
    return result;
  },

  async updateCompanyStatus(companyId: string, status: boolean): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .update({ status })
      .eq('id', companyId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async resetAdminPassword(userId: string): Promise<void> {
    const { data: result, error } = await supabase.functions.invoke('reset-password', {
      body: { user_id: userId },
    });
    if (error) throw new Error(error.message || 'Failed to reset password');
    if (result?.error) throw new Error(result.error);
  },

  async getCompaniesWithAdmins(): Promise<CompanyWithAdmin[]> {
    const { data: companies, error: compError } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true });
    if (compError) throw compError;

    const { data: admins, error: adminError } = await supabase
      .from('users')
      .select('id, email, full_name, company_id')
      .eq('role', 'admin');
    if (adminError) throw adminError;

    return (companies || []).map((company: Company) => {
      const admin = (admins || []).find((a: any) => a.company_id === company.id);
      return {
        ...company,
        admin_user: admin ? { id: admin.id, email: admin.email, full_name: admin.full_name } : undefined,
      };
    });
  },
};
