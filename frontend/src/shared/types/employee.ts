export interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  department: string;
  position: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  is_active: boolean;
  face_registered: boolean;
  face_image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeCreatePayload {
  employee_code: string;
  full_name: string;
  department: string;
  position: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface EmployeeUpdatePayload {
  full_name?: string;
  department?: string;
  position?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface EmployeeListResponse {
  items: Employee[];
  total: number;
  limit: number;
  offset: number;
}

export interface FaceRegistrationResponse {
  employee_id: string;
  success: boolean;
  message: string;
  quality_score?: number | null;
  model_version: string;
}
