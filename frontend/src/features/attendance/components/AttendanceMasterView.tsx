import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { BentoCard } from '../../../shared/components/ui/BentoCard';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { Avatar } from '../../../shared/components/ui/Avatar';
import { Employee } from '../../../shared/types/employee';
import { AttendanceRecord, AttendanceEvent } from '../../../shared/types/attendance';
import { attendanceApi } from '../../../shared/api/attendanceApi';
import { formatTime } from '../../../shared/utils/formatters';
import { useEmployees } from '../../employees/hooks/useEmployees';
import { useAttendanceWebSocket } from '../hooks/useAttendanceWebSocket';
import { EmployeeCalendarModal } from './EmployeeCalendarModal';

export interface AttendanceMasterViewProps {
  employees?: Employee[];
  events?: AttendanceEvent[];
  onOpenCalendarModal?: (employee: Employee) => void;
}

export type AttendanceFilterTab = 'all' | 'present' | 'absent' | 'late';

// Memoized table row for smooth 60fps scrolling
interface AttendanceRowProps {
  emp: Employee;
  record?: AttendanceRecord;
  onOpenCalendarModal: (employee: Employee) => void;
}

const AttendanceRow = React.memo<AttendanceRowProps>(({
  emp,
  record,
  onOpenCalendarModal,
}) => {
  const isPresent = Boolean(record);
  const isLate = record?.status === 'late';

  return (
    <tr className="hover:bg-neutral-50/70 transition-colors group">
      {/* Column 1: Employee */}
      <td className="py-3.5 px-3">
        <div className="flex items-center gap-3">
          <Avatar employee={emp} size="sm" />
          <div className="min-w-0">
            <p className="font-bold text-neutral-900 group-hover:text-black truncate">
              {emp.full_name}
            </p>
            <p className="text-[11px] font-mono text-neutral-400">
              {emp.employee_code}
            </p>
          </div>
        </div>
      </td>

      {/* Column 2: Dept & Position */}
      <td className="py-3.5 px-3">
        <p className="font-semibold text-neutral-800">{emp.position}</p>
        <p className="text-[11px] text-neutral-400">{emp.department}</p>
      </td>

      {/* Column 3: Check-in Time */}
      <td className="py-3.5 px-3 font-mono">
        {record ? (
          <span className="font-bold text-emerald-700">
            {formatTime(record.check_in_time)}
          </span>
        ) : (
          <span className="text-neutral-400 font-medium">--:--:--</span>
        )}
      </td>

      {/* Column 4: Check-out Time */}
      <td className="py-3.5 px-3 font-mono text-neutral-600">
        {record?.check_out_time ? (
          <span className="font-semibold">{formatTime(record.check_out_time)}</span>
        ) : (
          <span className="text-neutral-400">--:--:--</span>
        )}
      </td>

      {/* Column 5: Status Badge */}
      <td className="py-3.5 px-3">
        {isPresent ? (
          <Badge variant={isLate ? 'warning' : 'success'} size="sm">
            {isLate ? 'มาสาย (Late)' : 'เข้างานแล้ว (Present)'}
          </Badge>
        ) : (
          <Badge variant="danger" size="sm">
            ยังไม่เข้างาน (Absent)
          </Badge>
        )}
      </td>

      {/* Column 6: Actions */}
      <td className="py-3.5 px-3 text-right">
        <div className="flex items-center justify-end">
          {/* View Full Monthly Calendar */}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onOpenCalendarModal(emp)}
            className="text-[11px] py-1 px-3 h-7 font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors shadow-none"
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-neutral-500" />
            ปฏิทินทั้งเดือน
          </Button>
        </div>
      </td>
    </tr>
  );
});

AttendanceRow.displayName = 'AttendanceRow';

export const AttendanceMasterView: React.FC<AttendanceMasterViewProps> = ({
  employees: propEmployees,
  events: propEvents,
  onOpenCalendarModal: propOnOpenCalendar,
}) => {
  const employeeHooks = useEmployees();
  const wsHooks = useAttendanceWebSocket();
  const employees = propEmployees ?? employeeHooks.employees;
  const events = propEvents ?? wsHooks.events;

  const [internalCalendarEmp, setInternalCalendarEmp] = useState<Employee | null>(null);
  const handleCalendar = propOnOpenCalendar || ((emp: Employee) => setInternalCalendarEmp(emp));

  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [filterTab, setFilterTab] = useState<AttendanceFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('All');

  // Fetch today's attendance records in 1 single fast API call
  const fetchTodayRecords = useCallback(async () => {
    try {
      const records = await attendanceApi.getTodaySummary();
      setTodayRecords(records);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchTodayRecords();
  }, [fetchTodayRecords]);

  // When a live WebSocket event arrives from Kiosk / Camera, refresh today's records
  useEffect(() => {
    if (events.length > 0) {
      fetchTodayRecords();
    }
  }, [events, fetchTodayRecords]);

  // Map today's records by employee_id for O(1) instant lookup
  const recordMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    todayRecords.forEach((r) => map.set(r.employee_id, r));
    return map;
  }, [todayRecords]);

  // Compute real organization metrics
  const totalEmployees = employees.length;
  const presentEmployees = employees.filter((e) => recordMap.has(e.id));
  const presentCount = presentEmployees.length;
  const lateCount = todayRecords.filter((r) => r.status === 'late').length;
  const absentCount = Math.max(0, totalEmployees - presentCount);
  const attendanceRate = totalEmployees > 0 ? (presentCount / totalEmployees) * 100 : 0;

  // Filter employees based on Tab, Search, and Department
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const record = recordMap.get(emp.id);
      const isPresent = Boolean(record);
      const isLate = record?.status === 'late';
      const isAbsent = !isPresent;

      // Tab filter
      if (filterTab === 'present' && !isPresent) return false;
      if (filterTab === 'absent' && !isAbsent) return false;
      if (filterTab === 'late' && !isLate) return false;

      // Department filter
      if (selectedDept !== 'All' && emp.department !== selectedDept) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = emp.full_name.toLowerCase().includes(q);
        const matchCode = emp.employee_code.toLowerCase().includes(q);
        const matchDept = emp.department.toLowerCase().includes(q);
        const matchPos = emp.position.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchDept && !matchPos) return false;
      }

      return true;
    });
  }, [employees, recordMap, filterTab, selectedDept, searchQuery]);

  // Departments list
  const departments = useMemo(() => {
    return ['All', ...Array.from(new Set(employees.map((e) => e.department).filter(Boolean)))];
  }, [employees]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Real-time Metrics (4 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Card 1: พนักงานทั้งหมด */}
        <BentoCard
          className={`p-5 cursor-pointer transition-all ${
            filterTab === 'all' ? 'ring-2 ring-neutral-900 shadow-md' : 'hover:bg-neutral-50'
          }`}
          onClick={() => setFilterTab('all')}
        >
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 mb-2">
            <Users className="w-4 h-4 text-neutral-600" />
            <span>พนักงานทั้งหมด</span>
          </div>
          <div className="flex items-baseline justify-between">
            <h4 className="text-3xl font-extrabold text-neutral-900">{totalEmployees}</h4>
            <span className="text-xs font-bold text-neutral-500">คน</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">อัตราเข้างาน {attendanceRate.toFixed(0)}%</p>
        </BentoCard>

        {/* Card 2: เข้างานแล้ววันนี้ */}
        <BentoCard
          className={`p-5 cursor-pointer transition-all ${
            filterTab === 'present' ? 'ring-2 ring-emerald-600 shadow-md bg-emerald-50/20' : 'hover:bg-neutral-50'
          }`}
          onClick={() => setFilterTab('present')}
        >
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>เข้างานแล้ววันนี้</span>
          </div>
          <div className="flex items-baseline justify-between">
            <h4 className="text-3xl font-extrabold text-emerald-600">{presentCount}</h4>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              {attendanceRate.toFixed(0)}%
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">บันทึกผ่าน AI Face Kiosk</p>
        </BentoCard>

        {/* Card 3: ยังไม่เข้างาน / ขาดงานวันนี้ */}
        <BentoCard
          className={`p-5 cursor-pointer transition-all ${
            filterTab === 'absent' ? 'ring-2 ring-rose-600 shadow-md bg-rose-50/20' : 'hover:bg-neutral-50'
          }`}
          onClick={() => setFilterTab('absent')}
        >
          <div className="flex items-center gap-2 text-xs font-bold text-rose-700 mb-2">
            <XCircle className="w-4 h-4 text-rose-600" />
            <span>ยังไม่เข้างานวันนี้</span>
          </div>
          <div className="flex items-baseline justify-between">
            <h4 className="text-3xl font-extrabold text-rose-600">{absentCount}</h4>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
              คลิกเพื่อดูรายชื่อ
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">ยังไม่มีการสแกนใบหน้าที่ตู้ Kiosk</p>
        </BentoCard>

        {/* Card 4: มาสาย */}
        <BentoCard
          className={`p-5 cursor-pointer transition-all ${
            filterTab === 'late' ? 'ring-2 ring-amber-600 shadow-md bg-amber-50/20' : 'hover:bg-neutral-50'
          }`}
          onClick={() => setFilterTab('late')}
        >
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>มาสายวันนี้</span>
          </div>
          <div className="flex items-baseline justify-between">
            <h4 className="text-3xl font-extrabold text-amber-600">{lateCount}</h4>
            <span className="text-xs font-bold text-neutral-400">คน</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">หลังเวลา 09:00 น.</p>
        </BentoCard>
      </div>

      {/* 2. Master Table & Filters */}
      <BentoCard className="p-6">
        {/* Header and Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">
              Organization Daily & Monthly Attendance
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              แสดงสถานะการเข้างานของพนักงานทุกคนแบบ Real-time จากตู้สแกนใบหน้า (Kiosk)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, รหัส, แผนก..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-full pl-9 pr-3 py-2 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <Button size="sm" variant="outline" onClick={fetchTodayRecords}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                filterTab === 'all'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              ทั้งหมด ({totalEmployees})
            </button>
            <button
              onClick={() => setFilterTab('present')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                filterTab === 'present'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              เข้างานแล้ว ({presentCount})
            </button>
            <button
              onClick={() => setFilterTab('absent')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                filterTab === 'absent'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              ยังไม่เข้างาน ({absentCount})
            </button>
            <button
              onClick={() => setFilterTab('late')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                filterTab === 'late'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              มาสาย ({lateCount})
            </button>
          </div>

          {/* Department Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  selectedDept === dept
                    ? 'bg-neutral-800 text-white'
                    : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Master Table with GPU Acceleration */}
        <div className="overflow-x-auto transform-gpu">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100">
              <tr>
                <th className="py-3.5 px-3">พนักงาน (Employee)</th>
                <th className="py-3.5 px-3">แผนก & ตำแหน่ง</th>
                <th className="py-3.5 px-3">เข้างานวันนี้ (Check-in)</th>
                <th className="py-3.5 px-3">ออกงาน (Check-out)</th>
                <th className="py-3.5 px-3">สถานะวันนี้</th>
                <th className="py-3.5 px-3 text-right">ประวัติเวลา (Monthly Calendar)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    ไม่พบพนักงานในเงื่อนไขการค้นหานี้
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <AttendanceRow
                    key={emp.id}
                    emp={emp}
                    record={recordMap.get(emp.id)}
                    onOpenCalendarModal={handleCalendar}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </BentoCard>

      {!propOnOpenCalendar && (
        <EmployeeCalendarModal
          isOpen={Boolean(internalCalendarEmp)}
          onClose={() => setInternalCalendarEmp(null)}
          employee={internalCalendarEmp}
        />
      )}
    </div>
  );
};
