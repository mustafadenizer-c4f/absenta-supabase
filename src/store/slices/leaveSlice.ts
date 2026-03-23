// src/store/slices/leaveSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { LeaveService } from '../../services/leave';
import { BalanceService } from '../../services/balance';
import { HolidaysService } from '../../services/holidays';
import { CollectiveLeaveService, CollectiveLeaveInput } from '../../services/collectiveLeave';
import { LeaveRequest, EnhancedLeaveBalanceSummary, CollectiveLeave, Holiday } from '../../types';

interface LeaveState {
  requests: LeaveRequest[];
  balances: EnhancedLeaveBalanceSummary[];
  collectiveLeaves: CollectiveLeave[];
  holidays: Holiday[];
  loading: boolean;
  error: string | null;
}

const initialState: LeaveState = {
  requests: [],
  balances: [],
  collectiveLeaves: [],
  holidays: [],
  loading: false,
  error: null,
};

export const fetchLeaveRequests = createAsyncThunk(
  'leave/fetchRequests',
  async (userId?: string) => {
    return await LeaveService.getRequests(userId);
  }
);

export const createLeaveRequest = createAsyncThunk(
  'leave/createRequest',
  async (requestData: Record<string, any>) => {
    return await LeaveService.createRequest(requestData);
  }
);

export const cancelLeaveRequest = createAsyncThunk(
  'leave/cancelRequest',
  async (requestId: string) => {
    return await LeaveService.cancelRequest(requestId);
  }
);

export const updateLeaveStatus = createAsyncThunk(
  'leave/updateStatus',
  async ({
    id,
    status,
    approvedBy,
    approvalComment,
  }: {
    id: string;
    status: string;
    approvedBy: string;
    approvalComment?: string;
  }) => {
    return await LeaveService.updateStatus(id, status, approvedBy, approvalComment);
  }
);

export const fetchLeaveBalances = createAsyncThunk(
  'leave/fetchBalances',
  async ({ userId, hireDate, birthDate, companyId }: { userId: string; hireDate: string; birthDate: string; companyId?: string }) => {
    return await BalanceService.getBalances(userId, hireDate, birthDate, companyId);
  }
);

export const fetchHolidays = createAsyncThunk(
  'leave/fetchHolidays',
  async (companyId: string | undefined) => {
    return await HolidaysService.getAll(companyId);
  }
);

export const fetchCalendarRequests = createAsyncThunk(
  'leave/fetchCalendarRequests',
  async ({ userId, startDate, endDate }: { userId: string; startDate: string; endDate: string }) => {
    const { data } = await LeaveService.getRequestsByUser(userId, {
      startDate,
      endDate,
      pageSize: 500,
    });
    return data;
  }
);

export const createCollectiveLeaveThunk = createAsyncThunk(
  'leave/createCollectiveLeave',
  async (input: CollectiveLeaveInput) => {
    return await CollectiveLeaveService.createCollectiveLeave(input);
  }
);

export const fetchCollectiveLeaves = createAsyncThunk(
  'leave/fetchCollectiveLeaves',
  async (companyId: string) => {
    return await CollectiveLeaveService.getCollectiveLeaves(companyId);
  }
);

const leaveSlice = createSlice({
  name: 'leave',
  initialState,
  reducers: {
    resetLeaveState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // fetchLeaveRequests
      .addCase(fetchLeaveRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeaveRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload;
      })
      .addCase(fetchLeaveRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch leave requests';
      })
      // createLeaveRequest
      .addCase(createLeaveRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createLeaveRequest.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = [action.payload, ...state.requests];
        // Invalidate balance cache
        state.balances = [];
      })
      .addCase(createLeaveRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create leave request';
      })
      // cancelLeaveRequest
      .addCase(cancelLeaveRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelLeaveRequest.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.requests.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.requests[index] = action.payload;
        }
        // Invalidate balance cache
        state.balances = [];
      })
      .addCase(cancelLeaveRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to cancel leave request';
      })
      // updateLeaveStatus
      .addCase(updateLeaveStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateLeaveStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.requests.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.requests[index] = action.payload;
        }
        // Invalidate balance cache
        state.balances = [];
      })
      .addCase(updateLeaveStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update leave status';
      })
      // fetchLeaveBalances
      .addCase(fetchLeaveBalances.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeaveBalances.fulfilled, (state, action) => {
        state.loading = false;
        state.balances = action.payload;
      })
      .addCase(fetchLeaveBalances.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch leave balances';
      })
      // fetchHolidays
      .addCase(fetchHolidays.pending, (state) => {
        if (state.holidays.length === 0) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchHolidays.fulfilled, (state, action) => {
        state.loading = false;
        state.holidays = action.payload;
      })
      .addCase(fetchHolidays.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch holidays';
      })
      // fetchCalendarRequests (date-range scoped)
      .addCase(fetchCalendarRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCalendarRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload;
      })
      .addCase(fetchCalendarRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch calendar requests';
      })
      // createCollectiveLeaveThunk
      .addCase(createCollectiveLeaveThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCollectiveLeaveThunk.fulfilled, (state) => {
        state.loading = false;
        // Invalidate balance cache since collective leave affects balances
        state.balances = [];
      })
      .addCase(createCollectiveLeaveThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create collective leave';
      })
      // fetchCollectiveLeaves
      .addCase(fetchCollectiveLeaves.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCollectiveLeaves.fulfilled, (state, action) => {
        state.loading = false;
        state.collectiveLeaves = action.payload;
      })
      .addCase(fetchCollectiveLeaves.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch collective leaves';
      });
  },
});

export const { resetLeaveState } = leaveSlice.actions;
export default leaveSlice.reducer;
