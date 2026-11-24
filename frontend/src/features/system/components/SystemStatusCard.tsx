import React from 'react';
import { Cpu, Database, Wifi } from 'lucide-react';
import { BentoCard } from '../../../shared/components/ui/BentoCard';
import { Badge } from '../../../shared/components/ui/Badge';
import { SystemHealth } from '../../../shared/types/system';

interface SystemStatusCardProps {
  health: SystemHealth | null;
  isChecking: boolean;
  error: string | null;
}

export const SystemStatusCard: React.FC<SystemStatusCardProps> = React.memo(({
  health,
  isChecking,
  error,
}) => {
  const isHealthy = health?.status === 'ok';

  return (
    <BentoCard className="p-6 md:p-8 bg-white border border-neutral-200/80 shadow-bento rounded-3xl">
      {/* Header matching "Comments" in reference */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
        <div>
          <h4 className="text-base font-bold text-neutral-900">
            Comments
          </h4>
          <p className="text-xs text-neutral-400">System diagnostics & status</p>
        </div>

        <Badge
          variant={isHealthy ? 'success' : error ? 'danger' : 'warning'}
          size="sm"
          dot
        >
          {isHealthy
            ? 'Active'
            : isChecking
            ? 'Checking...'
            : 'Standby'}
        </Badge>
      </div>

      {/* List items formatted cleanly like the comments in reference */}
      <div className="space-y-4 pt-4">
        {/* Item 1: InsightFace Engine */}
        <div className="flex items-start gap-3 group">
          <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-bold text-neutral-900 truncate">
                InsightFace AI <span className="font-normal text-neutral-400">on Engine Core</span>
              </p>
              <span className="text-[10px] text-neutral-400 shrink-0">09:00 AM</span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
              MobileFaceNet ONNX model is {health?.ai_engine === 'healthy' ? 'ready' : 'in standby'}. Embeddings indexed: {health?.embedding_index_size ?? 0}
            </p>
          </div>
        </div>

        {/* Item 2: Database & Redis */}
        <div className="flex items-start gap-3 group">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
            <Database className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-bold text-neutral-900 truncate">
                PostgreSQL & Redis <span className="font-normal text-neutral-400">on DB Cluster</span>
              </p>
              <span className="text-[10px] text-neutral-400 shrink-0">08:45 AM</span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
              {health?.database === 'connected' ? 'Database connected' : 'Database standby'} with deduplication cache enabled.
            </p>
          </div>
        </div>

        {/* Item 3: WebSocket Stream */}
        <div className="flex items-start gap-3 group">
          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
            <Wifi className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-bold text-neutral-900 truncate">
                WebSocket Stream <span className="font-normal text-neutral-400">on /ws/attendance</span>
              </p>
              <span className="text-[10px] text-neutral-400 shrink-0">Live</span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
              Real-time recognition broadcast channel active ({health?.ws_connections ?? 1} client listening).
            </p>
          </div>
        </div>
      </div>
    </BentoCard>
  );
});

SystemStatusCard.displayName = 'SystemStatusCard';
