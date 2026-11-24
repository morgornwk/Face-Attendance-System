import React from 'react';
import { AttendanceStatsCards } from './AttendanceStatsCards';
import { AttendanceChart } from './AttendanceChart';
import { LiveAttendanceFeed } from './LiveAttendanceFeed';
import { SystemStatusCard } from '../../system/components/SystemStatusCard';
import { Employee } from '../../../shared/types/employee';
import { AttendanceEvent } from '../../../shared/types/attendance';
import { SystemHealth } from '../../../shared/types/system';
import { WebSocketStatus } from '../hooks/useAttendanceWebSocket';

export interface AttendanceDashboardProps {
  employees: Employee[];
  events: AttendanceEvent[];
  wsStatus: WebSocketStatus;
  health: SystemHealth | null;
  isHealthChecking: boolean;
  healthError: string | null;
  onOpenCreate: () => void;
  onOpenFaceModal: (emp: Employee) => void;
  onOpenHistoryModal: (emp?: Employee) => void;
  onNavigateEmployees: () => void;
}

export const AttendanceDashboard: React.FC<AttendanceDashboardProps> = ({
  employees,
  events,
  wsStatus,
  health,
  isHealthChecking,
  healthError,
  onOpenCreate,
  onOpenFaceModal,
  onOpenHistoryModal,
  onNavigateEmployees,
}) => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left 2 Columns: Overview Stats & Chart */}
      <div className="xl:col-span-8 flex flex-col gap-6">
        <AttendanceStatsCards
          employees={employees}
          events={events}
          onOpenDirectory={onNavigateEmployees}
          onOpenCreate={onOpenCreate}
          onOpenFaceModal={onOpenFaceModal}
        />

        <AttendanceChart />
      </div>

      {/* Right Column: Live Stream & System Health */}
      <div className="xl:col-span-4 flex flex-col gap-6">
        <LiveAttendanceFeed
          events={events}
          employees={employees}
          wsStatus={wsStatus}
          onOpenHistoryModal={onOpenHistoryModal}
        />

        <SystemStatusCard
          health={health}
          isChecking={isHealthChecking}
          error={healthError}
        />
      </div>
    </div>
  );
};
