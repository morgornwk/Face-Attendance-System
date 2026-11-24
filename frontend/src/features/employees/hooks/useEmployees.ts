import { useState, useEffect, useCallback } from 'react';
import { employeeApi } from '../../../shared/api/employeeApi';
import {
  Employee,
  EmployeeCreatePayload,
  EmployeeUpdatePayload,
} from '../../../shared/types/employee';

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await employeeApi.list(100, 0);
      setEmployees(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch employees');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const createEmployee = async (payload: EmployeeCreatePayload) => {
    const created = await employeeApi.create(payload);
    await fetchEmployees();
    return created;
  };

  const updateEmployee = async (id: string, payload: EmployeeUpdatePayload) => {
    const updated = await employeeApi.update(id, payload);
    await fetchEmployees();
    return updated;
  };

  const deactivateEmployee = async (id: string) => {
    await employeeApi.deactivate(id);
    await fetchEmployees();
  };

  const registerFace = async (id: string, file: File) => {
    const result = await employeeApi.registerFace(id, file);
    await fetchEmployees();
    return result;
  };

  return {
    employees,
    total,
    isLoading,
    error,
    refresh: fetchEmployees,
    createEmployee,
    updateEmployee,
    deactivateEmployee,
    registerFace,
  };
}
