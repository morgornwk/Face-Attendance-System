import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Badge } from '../../../shared/components/ui/Badge';
import { Avatar } from '../../../shared/components/ui/Avatar';
import { Employee } from '../../../shared/types/employee';
import { AttendanceMonthlySummary, AttendanceRecord } from '../../../shared/types/attendance';
import { attendanceApi } from '../../../shared/api/attendanceApi';
import { formatTime } from '../../../shared/utils/formatters';

interface EmployeeCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

export const EmployeeCalendarModal: React.FC<EmployeeCalendarModalProps> = ({
  isOpen,
  onClose,
  employee,
}) => {
  const currentDate = new Date();
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [month, setMonth] = useState<number>(currentDate.getMonth() + 1);
  const [summary, setSummary] = useState<AttendanceMonthlySummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchMonthlySummary = useCallback(async () => {
    if (!employee) return;
    try {
      setIsLoading(true);
      const res = await attendanceApi.getMonthlySummary(employee.id, year, month);
      setSummary(res);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  }, [employee, year, month]);

  useEffect(() => {
    if (isOpen && employee) {
      fetchMonthlySummary();
    }
  }, [isOpen, employee, fetchMonthlySummary]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const monthNames = [
    'January (มกราคม)',
    'February (กุมภาพันธ์)',
    'March (มีนาคม)',
    'April (เมษายน)',
    'May (พฤษภาคม)',
    'June (มิถุนายน)',
    'July (กรกฎาคม)',
    'August (สิงหาคม)',
    'September (กันยายน)',
    'October (ตุลาคม)',
    'November (พฤศจิกายน)',
    'December (ธันวาคม)',
  ];

  const recordsByDay = new Map<number, AttendanceRecord>();
  if (summary) {
    summary.records.forEach((rec) => {
      const day = parseInt(rec.work_date.split('-')[2], 10);
      recordsByDay.set(day, rec);
    });
  }

  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const startOffset = (firstDayOfWeek + 6) % 7;

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  const todayStr = `${todayYear}-${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ปฏิทินบันทึกเวลาประจำเดือน"
      description={
        employee
          ? `${employee.full_name} (${employee.employee_code}) - แผนก ${employee.department}`
          : 'รายละเอียดการเข้างานประจำเดือน'
      }
      maxWidth="4xl"
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
          <div className="flex items-center gap-3">
            <Avatar employee={employee} size="md" />
            <div>
              <p className="font-bold text-neutral-900 text-sm">{employee?.full_name}</p>
              <p className="text-xs text-neutral-400 font-mono">
                {employee?.employee_code} • {employee?.position}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="w-9 h-9 rounded-xl border border-neutral-200 bg-white flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs font-bold text-neutral-800 min-w-[180px] text-center select-none shadow-xs">
              {monthNames[month - 1]} {year}
            </div>
            <button
              onClick={handleNextMonth}
              className="w-9 h-9 rounded-xl border border-neutral-200 bg-white flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
            <p className="text-[11px] font-bold text-neutral-400 uppercase">วันทำงานทั้งหมด</p>
            <p className="text-2xl font-extrabold text-neutral-900 mt-0.5">
              {summary ? summary.working_days : '--'}{' '}
              <span className="text-xs font-normal text-neutral-400">วัน</span>
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 shadow-xs">
            <p className="text-[11px] font-bold text-emerald-700 uppercase">เข้างาน (Present)</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-0.5">
              {summary ? summary.present_days : '--'}{' '}
              <span className="text-xs font-normal text-emerald-600">วัน</span>
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200 shadow-xs">
            <p className="text-[11px] font-bold text-amber-700 uppercase">มาสาย (Late)</p>
            <p className="text-2xl font-extrabold text-amber-700 mt-0.5">
              {summary ? summary.late_days : '--'}{' '}
              <span className="text-xs font-normal text-amber-600">วัน</span>
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200 shadow-xs">
            <p className="text-[11px] font-bold text-rose-700 uppercase">ขาดงาน (Absent)</p>
            <p className="text-2xl font-extrabold text-rose-700 mt-0.5">
              {summary ? summary.absent_days : '--'}{' '}
              <span className="text-xs font-normal text-rose-600">วัน</span>
            </p>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-neutral-400 uppercase tracking-wider pb-2 border-b border-neutral-100">
            <div>จันทร์ (Mon)</div>
            <div>อังคาร (Tue)</div>
            <div>พุธ (Wed)</div>
            <div>พฤหัส (Thu)</div>
            <div>ศุกร์ (Fri)</div>
            <div className="text-neutral-300">เสาร์ (Sat)</div>
            <div className="text-neutral-300">อาทิตย์ (Sun)</div>
          </div>

          <div className="grid grid-cols-7 gap-2 pt-2.5">
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 rounded-2xl bg-neutral-50/40" />
            ))}

            {Array.from({ length: totalDaysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const curDateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dateObj = new Date(year, month - 1, dayNum);
              const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
              const record = recordsByDay.get(dayNum);

              const isToday = curDateStr === todayStr;
              const isPast = curDateStr < todayStr;
              const isFuture = curDateStr > todayStr;
              const isAbsent = isPast && !isWeekend && !record;

              return (
                <div
                  key={dayNum}
                  className={`h-20 p-2 rounded-2xl border transition-all flex flex-col justify-between ${
                    isToday
                      ? 'border-neutral-900 ring-2 ring-neutral-900/10 bg-white shadow-sm'
                      : isWeekend
                      ? 'bg-neutral-50/50 border-neutral-100 text-neutral-400'
                      : record
                      ? record.status === 'late'
                        ? 'bg-amber-50/50 border-amber-200'
                        : 'bg-emerald-50/50 border-emerald-200'
                      : isAbsent
                      ? 'bg-rose-50/40 border-rose-200/80'
                      : 'bg-white border-neutral-200/70 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold leading-none ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center -ml-0.5 -mt-0.5'
                          : isWeekend
                          ? 'text-neutral-400'
                          : 'text-neutral-700'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {record ? (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          record.status === 'late'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {record.status === 'late' ? 'สาย' : 'มา'}
                      </span>
                    ) : isAbsent ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800">
                        ขาด
                      </span>
                    ) : null}
                  </div>

                  <div className="font-mono text-right">
                    {record ? (
                      <span className="text-[10px] font-bold text-neutral-900 block leading-tight">
                        {formatTime(record.check_in_time)}
                      </span>
                    ) : isWeekend ? (
                      <span className="text-[9px] text-neutral-400">วันหยุด</span>
                    ) : isFuture ? (
                      <span className="text-[9px] text-neutral-300">--:--</span>
                    ) : (
                      <span className="text-[9px] text-neutral-400">--:--</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs text-neutral-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> เข้างานปกติ
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> มาสาย
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> ขาดงาน
            </span>
            <span className="flex items-center gap-1.5 text-neutral-400">
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-200" /> วันหยุด / วันในอนาคต
            </span>
          </div>

          <Badge variant="neutral" size="sm">
            {isLoading ? 'กำลังโหลด...' : `${summary?.records.length || 0} บันทึกในเดือนนี้`}
          </Badge>
        </div>
      </div>
    </Modal>
  );
};
