import React, { useState, useEffect, useCallback } from 'react';
import { Filter, Clock, ChevronDown } from 'lucide-react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { attendanceApi } from '../../../shared/api/attendanceApi';
import { Employee } from '../../../shared/types/employee';
import { AttendanceRecord } from '../../../shared/types/attendance';
import { formatTime, formatDate, formatConfidence } from '../../../shared/utils/formatters';

interface AttendanceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  initialEmployee?: Employee | null;
}

export const AttendanceHistoryModal: React.FC<AttendanceHistoryModalProps> = ({
  isOpen,
  onClose,
  employees,
  initialEmployee,
}) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialEmployee) {
      setSelectedEmployeeId(initialEmployee.id);
    } else if (employees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(employees[0].id);
    }
  }, [initialEmployee, employees, selectedEmployeeId]);

  const fetchRecords = useCallback(async () => {
    if (!selectedEmployeeId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await attendanceApi.getHistory(
        selectedEmployeeId,
        startDate,
        endDate
      );
      setRecords(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch attendance history');
    } finally {
      setIsLoading(false);
    }
  }, [selectedEmployeeId, startDate, endDate]);

  useEffect(() => {
    if (isOpen && selectedEmployeeId) {
      fetchRecords();
    }
  }, [isOpen, selectedEmployeeId, fetchRecords]);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attendance History & Logs"
      description={
        selectedEmployee
          ? `Viewing biometric check-in/out logs for ${selectedEmployee.full_name} (${selectedEmployee.employee_code})`
          : 'View biometric check-in and check-out logs by employee and date range.'
      }
      maxWidth="4xl"
    >
      <div className="space-y-5">
        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3 p-4 bg-neutral-50 rounded-2xl border border-neutral-200/70">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
              Select Employee
            </label>
            <div className="relative">
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full appearance-none bg-white border border-neutral-200 rounded-xl pl-3 pr-8 py-1.5 text-xs font-semibold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.employee_code}) - {emp.department}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
              Start Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
              End Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          <div className="pt-5">
            <Button size="sm" onClick={fetchRecords} isLoading={isLoading}>
              <Filter className="w-3.5 h-3.5 mr-1" />
              Filter
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Table Results */}
        <div className="overflow-x-auto rounded-2xl border border-neutral-200/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Check-in</th>
                <th className="py-3 px-4">Check-out</th>
                <th className="py-3 px-4">Camera ID</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-neutral-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-neutral-400 animate-ping" />
                      Loading logs...
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <Clock className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                    No attendance records found for this period.
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-neutral-800">
                      {formatDate(rec.work_date)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-700 font-medium">
                      {formatTime(rec.check_in_time)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-600">
                      {rec.check_out_time ? formatTime(rec.check_out_time) : '--:--'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-400">
                      {rec.camera_id}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium">
                      {formatConfidence(rec.confidence_score)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          rec.status === 'on_time'
                            ? 'success'
                            : rec.status === 'late'
                            ? 'warning'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {rec.status.replace('_', ' ')}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};
