export interface AttendanceRecord {
  id: string;
  employee_id: string;
  work_date: string;
  check_in_time: string;
  check_out_time: string | null;
  camera_id: string;
  confidence_score: number;
  status: string;
  created_at: string;
}

export interface AttendanceEvent {
  event_type: 'check_in' | 'check_out';
  employee_id: string;
  employee_code?: string | null;
  full_name?: string | null;
  camera_id: string;
  confidence: number;
  timestamp: string;
}

export interface AttendanceCheckInPayload {
  employee_id: string;
  camera_id?: string;
  confidence_score?: number;
  status?: 'present' | 'late';
}

export interface AttendanceMonthlySummary {
  employee_id: string;
  year: number;
  month: number;
  total_days: number;
  working_days: number;
  present_days: number;
  late_days: number;
  absent_days: number;
  attendance_rate: number;
  records: AttendanceRecord[];
}

export interface AttendanceDistributionItem {
  date: string;
  day: string;
  count: number;
  height: string;
  is_today: boolean;
}

export interface AttendanceDistributionResponse {
  days: number;
  total_active_employees: number;
  on_time_rate: number;
  daily_data: AttendanceDistributionItem[];
}
