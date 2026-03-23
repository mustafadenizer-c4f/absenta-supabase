// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import leaveReducer from './slices/leaveSlice';
import organizationReducer from './slices/organizationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: userReducer,
    leave: leaveReducer,
    organization: organizationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;