// src/store/slices/organizationSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { OrganizationService } from '../../services/organization';
import { SupervisorService } from '../../services/supervisor';
import { Company, Group, Department, Team, HierarchyProfile, DEFAULT_WORKDAYS } from '../../types';
import { RootState } from '../index';

interface OrganizationState {
  companies: Company[];
  groups: Group[];
  departments: Department[];
  teams: Team[];
  hierarchyProfile: HierarchyProfile | null;
  workdayConfig: number[] | null;
  loading: boolean;
  error: string | null;
}

const initialState: OrganizationState = {
  companies: [],
  groups: [],
  departments: [],
  teams: [],
  hierarchyProfile: null,
  workdayConfig: null,
  loading: false,
  error: null,
};

// ── Company thunks ───────────────────────────────────────────

export const fetchCompanies = createAsyncThunk(
  'organization/fetchCompanies',
  async (_, { rejectWithValue }) => {
    try {
      return await OrganizationService.getCompanies();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createCompany = createAsyncThunk(
  'organization/createCompany',
  async (name: string, { rejectWithValue }) => {
    try {
      return await OrganizationService.createCompany(name);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateCompany = createAsyncThunk(
  'organization/updateCompany',
  async ({ id, name }: { id: string; name: string }, { rejectWithValue }) => {
    try {
      return await OrganizationService.updateCompany(id, name);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteCompany = createAsyncThunk(
  'organization/deleteCompany',
  async (id: string, { rejectWithValue }) => {
    try {
      await OrganizationService.deleteCompany(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateCompanyStatus = createAsyncThunk(
  'organization/updateCompanyStatus',
  async ({ id, status }: { id: string; status: boolean }, { rejectWithValue }) => {
    try {
      return await SupervisorService.updateCompanyStatus(id, status);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ── Group thunks ─────────────────────────────────────────────

export const fetchGroups = createAsyncThunk(
  'organization/fetchGroups',
  async (companyId: string | undefined, { rejectWithValue }) => {
    try {
      return await OrganizationService.getGroups(companyId);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createGroup = createAsyncThunk(
  'organization/createGroup',
  async ({ name, companyId }: { name: string; companyId: string }, { rejectWithValue }) => {
    try {
      return await OrganizationService.createGroup(name, companyId);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateGroup = createAsyncThunk(
  'organization/updateGroup',
  async ({ id, name }: { id: string; name: string }, { rejectWithValue }) => {
    try {
      return await OrganizationService.updateGroup(id, name);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteGroup = createAsyncThunk(
  'organization/deleteGroup',
  async (id: string, { rejectWithValue }) => {
    try {
      await OrganizationService.deleteGroup(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ── Department thunks ────────────────────────────────────────

export const fetchDepartments = createAsyncThunk(
  'organization/fetchDepartments',
  async (groupId: string | undefined, { rejectWithValue }) => {
    try {
      return await OrganizationService.getDepartments(groupId);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createDepartment = createAsyncThunk(
  'organization/createDepartment',
  async ({ name, groupId, companyId }: { name: string; groupId?: string; companyId?: string }, { rejectWithValue }) => {
    try {
      return await OrganizationService.createDepartment(name, groupId, companyId);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateDepartment = createAsyncThunk(
  'organization/updateDepartment',
  async ({ id, name }: { id: string; name: string }, { rejectWithValue }) => {
    try {
      return await OrganizationService.updateDepartment(id, name);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteDepartment = createAsyncThunk(
  'organization/deleteDepartment',
  async (id: string, { rejectWithValue }) => {
    try {
      await OrganizationService.deleteDepartment(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ── Team thunks ──────────────────────────────────────────────

export const fetchTeams = createAsyncThunk(
  'organization/fetchTeams',
  async (departmentId: string | undefined, { rejectWithValue }) => {
    try {
      return await OrganizationService.getTeams(departmentId);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createTeam = createAsyncThunk(
  'organization/createTeam',
  async ({ name, departmentId, companyId }: { name: string; departmentId?: string; companyId?: string }, { rejectWithValue }) => {
    try {
      return await OrganizationService.createTeam(name, departmentId, companyId);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateTeam = createAsyncThunk(
  'organization/updateTeam',
  async ({ id, name }: { id: string; name: string }, { rejectWithValue }) => {
    try {
      return await OrganizationService.updateTeam(id, name);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteTeam = createAsyncThunk(
  'organization/deleteTeam',
  async (id: string, { rejectWithValue }) => {
    try {
      await OrganizationService.deleteTeam(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ── Hierarchy Profile thunks ─────────────────────────────────

export const fetchHierarchyProfile = createAsyncThunk(
  'organization/fetchHierarchyProfile',
  async (companyId: string, { rejectWithValue }) => {
    try {
      const company = await OrganizationService.getCompanyProfile(companyId);
      return company;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateHierarchyProfile = createAsyncThunk(
  'organization/updateHierarchyProfile',
  async ({ companyId, profile }: { companyId: string; profile: HierarchyProfile }, { rejectWithValue }) => {
    try {
      const company = await OrganizationService.updateHierarchyProfile(companyId, profile);
      return company.hierarchy_profile;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    clearOrganizationError: (state) => {
      state.error = null;
    },
    resetOrganizationState: () => initialState,
    setWorkdayConfig: (state, action) => {
      state.workdayConfig = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── fetchCompanies ──
      .addCase(fetchCompanies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanies.fulfilled, (state, action) => {
        state.loading = false;
        state.companies = action.payload;
      })
      .addCase(fetchCompanies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // ── createCompany ──
      .addCase(createCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.companies.push(action.payload);
      })
      .addCase(createCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // ── updateCompany ──
      .addCase(updateCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCompany.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.companies.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.companies[index] = action.payload;
        }
      })
      .addCase(updateCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // ── deleteCompany ──
      .addCase(deleteCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.companies = state.companies.filter((c) => c.id !== action.payload);
      })
      .addCase(deleteCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // ── updateCompanyStatus ──
      .addCase(updateCompanyStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCompanyStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.companies.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.companies[index] = action.payload;
        }
      })
      .addCase(updateCompanyStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // ── fetchGroups ──
      .addCase(fetchGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = action.payload;
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // ── createGroup ──
      .addCase(createGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.groups.push(action.payload);
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // ── updateGroup ──
      .addCase(updateGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateGroup.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.groups.findIndex((g) => g.id === action.payload.id);
        if (index !== -1) {
          state.groups[index] = action.payload;
        }
      })
      .addCase(updateGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // ── deleteGroup ──
      .addCase(deleteGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = state.groups.filter((g) => g.id !== action.payload);
      })
      .addCase(deleteGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // ── fetchDepartments ──
      .addCase(fetchDepartments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDepartments.fulfilled, (state, action) => {
        state.loading = false;
        state.departments = action.payload;
      })
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // ── createDepartment ──
      .addCase(createDepartment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDepartment.fulfilled, (state, action) => {
        state.loading = false;
        state.departments.push(action.payload);
      })
      .addCase(createDepartment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // ── updateDepartment ──
      .addCase(updateDepartment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDepartment.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.departments.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) {
          state.departments[index] = action.payload;
        }
      })
      .addCase(updateDepartment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // ── deleteDepartment ──
      .addCase(deleteDepartment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDepartment.fulfilled, (state, action) => {
        state.loading = false;
        state.departments = state.departments.filter((d) => d.id !== action.payload);
      })
      .addCase(deleteDepartment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // ── fetchTeams ──
      .addCase(fetchTeams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.loading = false;
        state.teams = action.payload;
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // ── createTeam ──
      .addCase(createTeam.fulfilled, (state, action) => {
        state.loading = false;
        state.teams.push(action.payload);
      })
      // ── updateTeam ──
      .addCase(updateTeam.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.teams.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.teams[index] = action.payload;
        }
      })
      // ── deleteTeam ──
      .addCase(deleteTeam.fulfilled, (state, action) => {
        state.loading = false;
        state.teams = state.teams.filter((t) => t.id !== action.payload);
      })
      // ── fetchHierarchyProfile ──
      .addCase(fetchHierarchyProfile.fulfilled, (state, action) => {
        state.hierarchyProfile = action.payload.hierarchy_profile;
        state.workdayConfig = action.payload.workday_config ?? null;
      })
      // ── updateHierarchyProfile ──
      .addCase(updateHierarchyProfile.fulfilled, (state, action) => {
        state.hierarchyProfile = action.payload;
      });
  },
});

export const { clearOrganizationError, resetOrganizationState, setWorkdayConfig } = organizationSlice.actions;

export const selectWorkdayConfig = (state: RootState): number[] =>
  state.organization.workdayConfig ?? DEFAULT_WORKDAYS;

export default organizationSlice.reducer;
