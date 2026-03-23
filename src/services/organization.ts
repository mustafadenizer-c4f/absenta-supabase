// src/services/organization.ts
import { supabase } from '../config/supabase';
import { Company, Group, Department, Team, HierarchyProfile } from '../types';

export const OrganizationService = {
  // ── Companies ──────────────────────────────────────────────

  async getCompanies(): Promise<Company[]> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  },

  async createCompany(name: string): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .insert({ name })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCompany(id: string, name: string): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCompany(id: string): Promise<void> {
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', id);

    if (countError) throw countError;
    if (count && count > 0) {
      throw new Error('Cannot delete company: users are still assigned to this company');
    }

    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ── Groups ─────────────────────────────────────────────────

  async getGroups(companyId?: string): Promise<Group[]> {
    let query = supabase
      .from('groups')
      .select('*')
      .order('name', { ascending: true });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  async createGroup(name: string, companyId: string): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .insert({ name, company_id: companyId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateGroup(id: string, name: string): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteGroup(id: string): Promise<void> {
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', id);

    if (countError) throw countError;
    if (count && count > 0) {
      throw new Error('Cannot delete group: users are still assigned to this group');
    }

    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ── Departments ────────────────────────────────────────────

  async getDepartments(groupId?: string): Promise<Department[]> {
    let query = supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true });

    if (groupId) {
      query = query.eq('group_id', groupId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  async createDepartment(name: string, groupId?: string, companyId?: string): Promise<Department> {
    const insertData: Record<string, any> = { name };
    if (groupId) insertData.group_id = groupId;
    if (companyId) insertData.company_id = companyId;

    const { data, error } = await supabase
      .from('departments')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateDepartment(id: string, name: string): Promise<Department> {
    const { data, error } = await supabase
      .from('departments')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteDepartment(id: string): Promise<void> {
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('department_id', id);

    if (countError) throw countError;
    if (count && count > 0) {
      throw new Error('Cannot delete department: users are still assigned to this department');
    }

    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ── Teams ──────────────────────────────────────────────────

  async getTeams(departmentId?: string): Promise<Team[]> {
    let query = supabase
      .from('teams')
      .select('*')
      .order('name', { ascending: true });

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createTeam(name: string, departmentId?: string, companyId?: string): Promise<Team> {
    const insertData: Record<string, any> = { name };
    if (departmentId) insertData.department_id = departmentId;
    if (companyId) insertData.company_id = companyId;

    const { data, error } = await supabase
      .from('teams')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTeam(id: string, name: string): Promise<Team> {
    const { data, error } = await supabase
      .from('teams')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTeam(id: string): Promise<void> {
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', id);

    if (countError) throw countError;
    if (count && count > 0) {
      throw new Error('Cannot delete team: users are still assigned to this team');
    }

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ── Hierarchy Profile ──────────────────────────────────────

  async getCompanyProfile(companyId: string): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateHierarchyProfile(companyId: string, profile: HierarchyProfile): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .update({ hierarchy_profile: profile })
      .eq('id', companyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
