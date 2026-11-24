import { apiClient } from './client';
import { SystemHealth } from '../types/system';

export const healthApi = {
  check: async (): Promise<SystemHealth> => {
    return apiClient<SystemHealth>('/health');
  },
};
