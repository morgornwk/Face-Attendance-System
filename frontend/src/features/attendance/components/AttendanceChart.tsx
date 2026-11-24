import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { BentoCard } from '../../../shared/components/ui/BentoCard';
import { attendanceApi } from '../../../shared/api/attendanceApi';
import { AttendanceDistributionItem } from '../../../shared/types/attendance';

export const AttendanceChart: React.FC = React.memo(() => {
  const [activeDay, setActiveDay] = useState<number>(0);
  const [filter, setFilter] = useState<'Last 7 days' | 'Last 14 days' | 'This month'>('Last 7 days');
  const [daysData, setDaysData] = useState<AttendanceDistributionItem[]>([]);
  const [onTimeRate, setOnTimeRate] = useState<number>(100.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchDistributionData = useCallback(async () => {
    try {
      setIsLoading(true);
      const daysCount = filter === 'Last 7 days' ? 7 : filter === 'Last 14 days' ? 14 : 30;
      const res = await attendanceApi.getDistribution(daysCount);

      setDaysData(res.daily_data);
      setOnTimeRate(res.on_time_rate);

      // Default active bar is today or the latest record
      const todayIdx = res.daily_data.findIndex((d) => d.is_today);
      setActiveDay(todayIdx >= 0 ? todayIdx : res.daily_data.length - 1);
    } catch (err) {
      console.error('Failed to load real attendance distribution:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchDistributionData();
  }, [fetchDistributionData]);

  return (
    <BentoCard className="p-6 md:p-8 bg-white border border-neutral-200/80 shadow-bento rounded-3xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-6">
        <div>
          <h4 className="text-base font-bold text-neutral-900">
            Attendance Flow
          </h4>
          <p className="text-xs text-neutral-400">
            {filter === 'Last 7 days'
              ? 'Weekly check-in distribution'
              : filter === 'Last 14 days'
              ? 'Bi-weekly check-in distribution'
              : 'Monthly check-in distribution'}
          </p>
        </div>

        <div className="relative inline-flex items-center">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="appearance-none bg-white border border-neutral-200/90 rounded-full pl-4 pr-8 py-1.5 text-xs font-semibold text-neutral-800 shadow-xs hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer transition-all"
          >
            <option value="Last 7 days">Last 7 days</option>
            <option value="Last 14 days">Last 14 days</option>
            <option value="This month">This month</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-500 absolute right-3 pointer-events-none stroke-[2]" />
        </div>
      </div>

      {/* Main Grid: Real Metric on left, vertical bars on right */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-4">
        {/* Large Metric on bottom left calculated from real records */}
        <div className="pb-2">
          <span className="text-4xl sm:text-5xl font-extrabold text-neutral-900 tracking-tight">
            {isLoading ? '...' : `${onTimeRate.toFixed(1)}%`}
          </span>
          <p className="text-xs font-semibold text-neutral-400 mt-1">
            Avg On-time attendance rate
          </p>
        </div>

        {/* Vertical Bars Container */}
        <div className="flex items-end justify-end gap-2 sm:gap-3.5 h-48 overflow-x-auto scrollbar-none pb-1">
          {isLoading ? (
            <div className="w-full flex items-center justify-center h-36 text-neutral-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
              <span className="text-xs">Loading attendance statistics...</span>
            </div>
          ) : daysData.length === 0 ? (
            <div className="w-full flex items-center justify-center h-36 text-neutral-400">
              <span className="text-xs">No attendance data found in this range.</span>
            </div>
          ) : (
            daysData.map((item, index) => {
              const isActive = index === activeDay;
              return (
                <div
                  key={`${item.date}-${index}`}
                  className="flex flex-col items-center gap-2 h-full justify-end group cursor-pointer shrink-0"
                  onClick={() => setActiveDay(index)}
                  title={`${item.date}: ${item.count} checked in`}
                >
                  {/* Floating pill badge showing real check-in count */}
                  {isActive ? (
                    <div className="relative -mb-1 animate-in fade-in duration-200">
                      <div className="bg-[#111827] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md flex items-center gap-1 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {item.count} present
                      </div>
                      <div className="w-1.5 h-1.5 bg-[#111827] rotate-45 mx-auto -mt-0.5" />
                    </div>
                  ) : (
                    <div className="h-5" /> // Spacer for consistent alignment
                  )}

                  {/* Pill Bar */}
                  <div className="w-7 sm:w-9 h-36 bg-transparent flex items-end justify-center">
                    <div
                      style={{ height: item.height }}
                      className={`w-full rounded-full transition-all duration-300 ${
                        isActive
                          ? 'bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-sm'
                          : item.count > 0
                          ? 'bg-neutral-200/90 group-hover:bg-neutral-300'
                          : 'bg-neutral-100 group-hover:bg-neutral-200/80'
                      }`}
                    />
                  </div>

                  {/* Day Label */}
                  <span
                    className={`text-xs font-semibold transition-colors ${
                      isActive
                        ? 'text-neutral-900 font-bold'
                        : item.is_today
                        ? 'text-neutral-800 font-bold'
                        : 'text-neutral-400'
                    }`}
                  >
                    {item.day}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </BentoCard>
  );
});

AttendanceChart.displayName = 'AttendanceChart';
