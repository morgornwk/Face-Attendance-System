import React, { useState, useCallback } from 'react';
import { AttendanceStatsCards } from './AttendanceStatsCards';
import { AttendanceChart } from './AttendanceChart';
import { LiveAttendanceFeed } from './LiveAttendanceFeed';
import { SystemStatusCard } from '../../system/components/SystemStatusCard';
import { Employee } from '../../../shared/types/employee';
import { AttendanceEvent } from '../../../shared/types/attendance';
import { SystemHealth } from '../../../shared/types/system';
import { WebSocketStatus, useAttendanceWebSocket } from '../hooks/useAttendanceWebSocket';
import { useEmployees } from '../../employees/hooks/useEmployees';
import { useSystemHealth } from '../../system/hooks/useSystemHealth';
import { useToast } from '../../../shared/components/ui/Toast';
import { EmployeeFormModal } from '../../employees/components/EmployeeFormModal';
import { FaceRegisterModal } from '../../employees/components/FaceRegisterModal';
import { AttendanceHistoryModal } from './AttendanceHistoryModal';

export interface AttendanceDashboardProps {
  employees?: Employee[];
  events?: AttendanceEvent[];
  wsStatus?: WebSocketStatus;
  health?: SystemHealth | null;
  isHealthChecking?: boolean;
  healthError?: string | null;
  onOpenCreate?: () => void;
  onOpenFaceModal?: (emp: Employee) => void;
  onOpenHistoryModal?: (emp?: Employee) => void;
  onNavigateEmployees?: () => void;
}

export const AttendanceDashboard: React.FC<AttendanceDashboardProps> = ({
  employees: propEmployees,
  events: propEvents,
  wsStatus: propWsStatus,
  health: propHealth,
  isHealthChecking: propIsHealthChecking,
  healthError: propHealthError,
  onOpenCreate: propOnOpenCreate,
  onOpenFaceModal: propOnOpenFace,
  onOpenHistoryModal: propOnOpenHistory,
  onNavigateEmployees,
}) => {
  const employeeHooks = useEmployees();
  const wsHooks = useAttendanceWebSocket();
  const healthHooks = useSystemHealth();
  const { showToast } = useToast();

  const employees = propEmployees ?? employeeHooks.employees;
  const events = propEvents ?? wsHooks.events;
  const wsStatus = propWsStatus ?? wsHooks.status;
  const health = propHealth ?? healthHooks.health;
  const isHealthChecking = propIsHealthChecking ?? healthHooks.isChecking;
  const healthError = propHealthError ?? healthHooks.error;

  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const [internalFaceEmp, setInternalFaceEmp] = useState<Employee | null>(null);
  const [internalHistoryEmp, setInternalHistoryEmp] = useState<Employee | null>(null);
  const [internalHistoryOpen, setInternalHistoryOpen] = useState(false);

  const handleCreate = propOnOpenCreate || (() => setInternalCreateOpen(true));
  const handleFace = propOnOpenFace || ((emp: Employee) => setInternalFaceEmp(emp));
  const handleHistory = propOnOpenHistory || ((emp?: Employee) => {
    setInternalHistoryEmp(emp || null);
    setInternalHistoryOpen(true);
  });

  const handleInternalCreateSubmit = useCallback(async (data: any) => {
    try {
      const created = await employeeHooks.createEmployee(data);
      showToast(`Employee ${created.full_name} created successfully!`, 'success');
      setInternalCreateOpen(false);
      setInternalFaceEmp(created);
    } catch (err: any) {
      showToast(err?.message || 'Failed to create employee', 'error');
    }
  }, [employeeHooks, showToast]);

  const handleInternalRegisterFace = useCallback(async (id: string, file: File) => {
    try {
      const res = await employeeHooks.registerFace(id, file);
      showToast('Face biometric registered successfully!', 'success');
      return res;
    } catch (err: any) {
      showToast(err?.message || 'Face registration failed', 'error');
      throw err;
    }
  }, [employeeHooks, showToast]);

  return (
    <>
      {/* Overview Stats & Chart Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Stats & Chart */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          <AttendanceStatsCards
            employees={employees}
            events={events}
            onOpenDirectory={onNavigateEmployees || (() => {})}
            onOpenCreate={handleCreate}
            onOpenFaceModal={handleFace}
          />
          <AttendanceChart />
        </div>

        {/* Right Column: Live Feed & System Health */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <LiveAttendanceFeed
            events={events}
            employees={employees}
            wsStatus={wsStatus}
            onOpenHistoryModal={handleHistory}
          />
          <SystemStatusCard
            health={health}
            isChecking={isHealthChecking}
            error={healthError}
          />
        </div>
      </div>

      {!propOnOpenCreate && (
        <EmployeeFormModal
          isOpen={internalCreateOpen}
          onClose={() => setInternalCreateOpen(false)}
          onSubmit={handleInternalCreateSubmit}
        />
      )}

      {!propOnOpenFace && (
        <FaceRegisterModal
          isOpen={Boolean(internalFaceEmp)}
          onClose={() => setInternalFaceEmp(null)}
          employee={internalFaceEmp}
          onRegisterFace={handleInternalRegisterFace}
        />
      )}

      {!propOnOpenHistory && (
        <AttendanceHistoryModal
          isOpen={internalHistoryOpen}
          onClose={() => setInternalHistoryOpen(false)}
          employees={employees}
          initialEmployee={internalHistoryEmp}
        />
      )}
    </>
  );
};
