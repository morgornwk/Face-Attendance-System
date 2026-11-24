import React from 'react';
import { SystemStatusCard } from './SystemStatusCard';
import { LiveAttendanceFeed } from '../../attendance/components/LiveAttendanceFeed';
import { SystemHealth } from '../../../shared/types/system';
import { AttendanceEvent } from '../../../shared/types/attendance';
import { Employee } from '../../../shared/types/employee';
import { WebSocketStatus } from '../../attendance/hooks/useAttendanceWebSocket';

export interface SystemDiagnosticsViewProps {
  health: SystemHealth | null;
  isChecking: boolean;
  error: string | null;
  events: AttendanceEvent[];
  wsStatus: WebSocketStatus;
  onOpenHistoryModal: (emp?: Employee) => void;
}

export const SystemDiagnosticsView: React.FC<SystemDiagnosticsViewProps> = ({
  health,
  isChecking,
  error,
  events,
  wsStatus,
  onOpenHistoryModal,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SystemStatusCard
        health={health}
        isChecking={isChecking}
        error={error}
      />
      <LiveAttendanceFeed
        events={events}
        wsStatus={wsStatus}
        onOpenHistoryModal={onOpenHistoryModal}
      />
    </div>
  );
};
