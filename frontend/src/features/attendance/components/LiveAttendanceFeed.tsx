import React from 'react';
import { BentoCard } from '../../../shared/components/ui/BentoCard';
import { Badge } from '../../../shared/components/ui/Badge';
import { Avatar } from '../../../shared/components/ui/Avatar';
import { Button } from '../../../shared/components/ui/Button';
import { AttendanceEvent } from '../../../shared/types/attendance';
import { Employee } from '../../../shared/types/employee';
import { WebSocketStatus } from '../hooks/useAttendanceWebSocket';
import { formatTime, formatConfidence } from '../../../shared/utils/formatters';

interface LiveAttendanceFeedProps {
  events: AttendanceEvent[];
  employees?: Employee[];
  wsStatus: WebSocketStatus;
  onOpenHistoryModal: () => void;
}

export const LiveAttendanceFeed: React.FC<LiveAttendanceFeedProps> = React.memo(({
  events,
  employees = [],
  wsStatus,
  onOpenHistoryModal,
}) => {
  const hasLiveEvents = events.length > 0;
  const displayEvents = hasLiveEvents ? events.slice(0, 5) : [];
  const displayEmployees = employees.slice(0, 5);

  return (
    <BentoCard className="p-6 md:p-8 bg-white border border-neutral-200/80 shadow-bento rounded-3xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-5 border-b border-neutral-100">
          <div>
            <h4 className="text-base font-bold text-neutral-900">
              Live Stream
            </h4>
            <p className="text-xs text-neutral-400">Real-time edge recognition</p>
          </div>

          <Badge
            variant={
              wsStatus === 'connected'
                ? 'success'
                : wsStatus === 'connecting'
                ? 'warning'
                : 'danger'
            }
            size="sm"
            dot
          >
            {wsStatus === 'connected'
              ? 'Stream Active'
              : wsStatus === 'connecting'
              ? 'Connecting...'
              : 'Standby'}
          </Badge>
        </div>

        <div className="divide-y divide-neutral-100 mt-1">
          {hasLiveEvents ? (
            displayEvents.map((event, idx) => {
              const matchedEmp = employees.find((e) => e.id === event.employee_id);
              return (
                <div
                  key={`${event.employee_id}-${event.timestamp}-${idx}`}
                  className="py-3.5 flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      employee={matchedEmp}
                      name={event.full_name}
                      size="sm"
                      isOnline={true}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 truncate">
                        {event.full_name || 'Verified Staff'}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-mono">
                        {event.employee_code || 'EMP-SCAN'} • {formatTime(event.timestamp)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-right">
                    <div className="text-right">
                      <p className="text-xs font-extrabold text-neutral-900 font-mono">
                        {formatConfidence(event.confidence)}
                      </p>
                    </div>
                    <Badge
                      variant={event.event_type === 'check_in' ? 'success' : 'purple'}
                      size="sm"
                    >
                      {event.event_type === 'check_in' ? 'Check-in' : 'Check-out'}
                    </Badge>
                  </div>
                </div>
              );
            })
          ) : displayEmployees.length > 0 ? (
            displayEmployees.map((emp) => (
              <div
                key={emp.id}
                className="py-3.5 flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar employee={emp} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-900 truncate">
                      {emp.full_name}
                    </p>
                    <p className="text-[11px] text-neutral-400 font-mono">
                      {emp.employee_code} • {emp.department}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <p className="text-xs font-medium text-neutral-500">
                    {emp.position}
                  </p>
                  <Badge
                    variant={emp.face_registered ? 'success' : 'warning'}
                    size="sm"
                  >
                    {emp.face_registered ? 'Registered' : 'Pending'}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-neutral-400 space-y-2">
              <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
              </div>
              <p className="text-xs font-medium">
                No recent attendance scans yet
              </p>
              <p className="text-[11px] text-neutral-400">
                Events will appear here as soon as a registered face is detected.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="pt-5 border-t border-neutral-100 mt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenHistoryModal}
          className="w-full text-xs font-semibold rounded-full border-neutral-200 hover:border-neutral-900"
        >
          All Attendance Records
        </Button>
      </div>
    </BentoCard>
  );
});

LiveAttendanceFeed.displayName = 'LiveAttendanceFeed';
