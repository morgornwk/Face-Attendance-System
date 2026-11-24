import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  UserPlus,
  ScanFace,
  ChevronDown,
} from 'lucide-react';
import { BentoCard } from '../../../shared/components/ui/BentoCard';
import { Avatar } from '../../../shared/components/ui/Avatar';
import { Button } from '../../../shared/components/ui/Button';
import { Employee } from '../../../shared/types/employee';
import { AttendanceEvent } from '../../../shared/types/attendance';

interface AttendanceStatsCardsProps {
  employees: Employee[];
  events: AttendanceEvent[];
  onOpenDirectory: () => void;
  onOpenCreate: () => void;
  onOpenFaceModal?: (emp: Employee) => void;
}

export const AttendanceStatsCards: React.FC<AttendanceStatsCardsProps> = React.memo(({
  employees,
  events,
  onOpenDirectory,
  onOpenCreate,
  onOpenFaceModal,
}) => {
  const [timeRange, setTimeRange] = useState('Today');

  // Real data calculations
  const totalEmployees = employees.length;
  const registeredFacesCount = employees.filter((e) => e.face_registered).length;
  const pendingFacesCount = totalEmployees - registeredFacesCount;

  // Real today check-in IDs from WebSocket / events
  const checkedInIds = new Set(
    events.filter((e) => e.event_type === 'check_in').map((e) => e.employee_id)
  );
  const presentCount = checkedInIds.size;
  const attendanceRate = totalEmployees > 0 ? (presentCount / totalEmployees) * 100 : 0;

  // Render registered employees to fill the horizontal strip across the card
  const displayEmployees = employees.slice(0, 30);

  return (
    <BentoCard className="p-6 md:p-8 space-y-6 bg-white border border-neutral-200/80 shadow-bento rounded-3xl">
      {/* 1. Header Row inside Overview Bento Card */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-neutral-900 tracking-tight">
          Overview
        </h3>
        <div className="relative inline-flex items-center">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="appearance-none bg-white border border-neutral-200/90 rounded-full pl-4 pr-8 py-1.5 text-xs font-semibold text-neutral-800 shadow-xs hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer transition-all"
          >
            <option value="Today">Today</option>
            <option value="This week">This week</option>
            <option value="This month">This month</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-500 absolute right-3 pointer-events-none stroke-[2]" />
        </div>
      </div>

      {/* 2. Real Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Real Total Staff */}
        <div className="bg-neutral-50/70 border border-neutral-200/60 rounded-2xl p-6 transition-all hover:bg-neutral-50">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 mb-2">
            <div className="w-6 h-6 rounded-full bg-neutral-200/80 flex items-center justify-center text-neutral-700">
              <Users className="w-3.5 h-3.5" />
            </div>
            <span>Customers / Staff</span>
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-4xl font-extrabold text-neutral-900 tracking-tight">
              {totalEmployees.toLocaleString()}
            </h4>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                registeredFacesCount === totalEmployees && totalEmployees > 0
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                  : 'text-amber-700 bg-amber-50 border-amber-100'
              }`}
            >
              {pendingFacesCount > 0 ? (
                <>
                  <ArrowDownRight className="w-3 h-3 text-amber-600" />
                  <span>{pendingFacesCount} pending face</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                  <span>100% registered</span>
                </>
              )}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-2 font-medium">
            {registeredFacesCount} face biometrics active in database
          </p>
        </div>

        {/* Card 2: Real Present / Attendance Rate */}
        <div className="bg-neutral-50/70 border border-neutral-200/60 rounded-2xl p-6 transition-all hover:bg-neutral-50">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 mb-2">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span>Balance / Present Today</span>
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-4xl font-extrabold text-neutral-900 tracking-tight">
              {totalEmployees > 0 ? `${presentCount}` : '0'}
            </h4>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <ArrowUpRight className="w-3 h-3" />
              <span>{attendanceRate.toFixed(0)}% Rate</span>
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-2 font-medium">
            {presentCount} checked in via face recognition stream
          </p>
        </div>
      </div>

      {/* 3. Real Employee Horizontal List */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h5 className="text-sm font-bold text-neutral-900">
              {totalEmployees > 0
                ? `${totalEmployees} Registered Team Members`
                : 'No Team Members Registered Yet'}
            </h5>
            <p className="text-xs text-neutral-400 mt-0.5">
              {totalEmployees > 0
                ? 'Showing registered employee profiles and biometrics.'
                : 'Create an employee to begin logging attendance with facial recognition.'}
            </p>
          </div>

          <Button size="sm" onClick={onOpenCreate} className="text-xs font-semibold">
            <UserPlus className="w-3.5 h-3.5 mr-1" />
            Add Member
          </Button>
        </div>

        {/* When no employees exist yet: show a clean banner prompt */}
        {totalEmployees === 0 ? (
          <div className="p-8 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-400 shadow-sm">
              <Users className="w-6 h-6 text-neutral-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-800">
                Employee Registry is Empty
              </p>
              <p className="text-xs text-neutral-500 max-w-sm mt-0.5">
                Click "+ Add Member" above to create an employee and capture their face photo.
              </p>
            </div>
          </div>
        ) : (
          /* When employees exist: render real employee avatars and data */
          <div className="flex items-center gap-6 overflow-x-auto py-2 px-1 scrollbar-none">
            {displayEmployees.map((emp) => (
              <div
                key={emp.id}
                className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer"
                onClick={() => {
                  if (!emp.face_registered && onOpenFaceModal) {
                    onOpenFaceModal(emp);
                  } else {
                    onOpenDirectory();
                  }
                }}
              >
                <div className="relative">
                  <Avatar
                    employee={emp}
                    size="lg"
                    className="hover:scale-105 transition-transform duration-150"
                  />
                  {!emp.face_registered && (
                    <span
                      title="No face registered yet - click to register"
                      className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-1 shadow-sm"
                    >
                      <ScanFace className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                <div className="text-center">
                  <p className="text-xs font-semibold text-neutral-800 group-hover:text-black truncate max-w-[85px]">
                    {emp.full_name.split(' ')[0]}
                  </p>
                  <p className="text-[10px] text-neutral-400 font-mono truncate max-w-[85px]">
                    {emp.employee_code}
                  </p>
                </div>
              </div>
            ))}

            {/* View all circular button at the end of the full employee list */}
            {totalEmployees > 0 && (
              <div
                className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group pl-2"
                onClick={onOpenDirectory}
              >
                <div className="w-14 h-14 rounded-full border border-neutral-300 bg-white flex items-center justify-center text-neutral-600 shadow-sm transition-all duration-200 group-hover:border-neutral-900 group-hover:bg-neutral-50 group-hover:scale-105">
                  <ArrowRight className="w-5 h-5 stroke-[1.75]" />
                </div>
                <span className="text-xs font-semibold text-neutral-500 group-hover:text-neutral-900 whitespace-nowrap">
                  View all ({totalEmployees})
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </BentoCard>
  );
});

AttendanceStatsCards.displayName = 'AttendanceStatsCards';
