import { apiClient } from './client';
import {
  AttendanceRecord,
  AttendanceCheckInPayload,
  AttendanceMonthlySummary,
} from '../types/attendance';

export const attendanceApi = {
  checkIn: async (payload: AttendanceCheckInPayload): Promise<AttendanceRecord> => {
    return apiClient<AttendanceRecord>('/api/v1/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getTodaySummary: async (): Promise<AttendanceRecord[]> => {
    return apiClient<AttendanceRecord[]>('/api/v1/attendance/today-summary');
  },

  getToday: async (employeeId: string): Promise<AttendanceRecord | null> => {
    return apiClient<AttendanceRecord | null>(`/api/v1/attendance/today/${employeeId}`);
  },

  getHistory: async (
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<AttendanceRecord[]> => {
    return apiClient<AttendanceRecord[]>(
      `/api/v1/attendance/history/${employeeId}?start_date=${startDate}&end_date=${endDate}`
    );
  },

  getMonthlySummary: async (
    employeeId: string,
    year: number,
    month: number
  ): Promise<AttendanceMonthlySummary> => {
    return apiClient<AttendanceMonthlySummary>(
      `/api/v1/attendance/monthly-summary/${employeeId}?year=${year}&month=${month}`
    );
  },
};
