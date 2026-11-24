import React, { useState } from 'react';
import { SystemStatusCard } from './SystemStatusCard';
import { LiveAttendanceFeed } from '../../attendance/components/LiveAttendanceFeed';
import { SystemHealth } from '../../../shared/types/system';
import { AttendanceEvent } from '../../../shared/types/attendance';
import { Employee } from '../../../shared/types/employee';
import { WebSocketStatus, useAttendanceWebSocket } from '../../attendance/hooks/useAttendanceWebSocket';
import { useSystemHealth } from '../hooks/useSystemHealth';
import { useEmployees } from '../../employees/hooks/useEmployees';
import { AttendanceHistoryModal } from '../../attendance/components/AttendanceHistoryModal';

export interface SystemDiagnosticsViewProps {
  health?: SystemHealth | null;
  isChecking?: boolean;
  error?: string | null;
  events?: AttendanceEvent[];
  wsStatus?: WebSocketStatus;
  onOpenHistoryModal?: (emp?: Employee) => void;
}

export const SystemDiagnosticsView: React.FC<SystemDiagnosticsViewProps> = ({
  health: propHealth,
  isChecking: propIsChecking,
  error: propError,
  events: propEvents,
  wsStatus: propWsStatus,
  onOpenHistoryModal: propOnOpenHistory,
}) => {
  const healthHooks = useSystemHealth();
  const wsHooks = useAttendanceWebSocket();
  const employeeHooks = useEmployees();

  const health = propHealth ?? healthHooks.health;
  const isChecking = propIsChecking ?? healthHooks.isChecking;
  const error = propError ?? healthHooks.error;
  const events = propEvents ?? wsHooks.events;
  const wsStatus = propWsStatus ?? wsHooks.status;

  const [internalHistoryEmp, setInternalHistoryEmp] = useState<Employee | null>(null);
  const [internalHistoryOpen, setInternalHistoryOpen] = useState(false);

  const handleHistory = propOnOpenHistory || ((emp?: Employee) => {
    setInternalHistoryEmp(emp || null);
    setInternalHistoryOpen(true);
  });

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemStatusCard
          health={health}
          isChecking={isChecking}
          error={error}
        />
        <LiveAttendanceFeed
          events={events}
          wsStatus={wsStatus}
          onOpenHistoryModal={handleHistory}
        />
      </div>

      {!propOnOpenHistory && (
        <AttendanceHistoryModal
          isOpen={internalHistoryOpen}
          onClose={() => setInternalHistoryOpen(false)}
          employees={employeeHooks.employees}
          initialEmployee={internalHistoryEmp}
        />
      )}
    </>
  );
};
