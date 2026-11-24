import { apiClient } from './client';
import {
  Employee,
  EmployeeCreatePayload,
  EmployeeListResponse,
  EmployeeUpdatePayload,
  FaceRegistrationResponse,
} from '../types/employee';

export const employeeApi = {
  list: async (limit = 50, offset = 0): Promise<EmployeeListResponse> => {
    return apiClient<EmployeeListResponse>(`/api/v1/employees/?limit=${limit}&offset=${offset}`);
  },

  getById: async (id: string): Promise<Employee> => {
    return apiClient<Employee>(`/api/v1/employees/${id}`);
  },

  create: async (payload: EmployeeCreatePayload): Promise<Employee> => {
    return apiClient<Employee>('/api/v1/employees/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update: async (id: string, payload: EmployeeUpdatePayload): Promise<Employee> => {
    return apiClient<Employee>(`/api/v1/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deactivate: async (id: string): Promise<void> => {
    await apiClient<void>(`/api/v1/employees/${id}`, {
      method: 'DELETE',
    });
  },

  registerFace: async (id: string, file: File): Promise<FaceRegistrationResponse> => {
    const formData = new FormData();
    formData.append('image', file);

    return apiClient<FaceRegistrationResponse>(`/api/v1/employees/${id}/face`, {
      method: 'POST',
      body: formData,
    });
  },
};
