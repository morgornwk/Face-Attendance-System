import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { BentoCard } from '../../../shared/components/ui/BentoCard';

export const AttendanceChart: React.FC = React.memo(() => {
  const [activeDay, setActiveDay] = useState(4); // Friday selected by default
  const [filter, setFilter] = useState('Last 7 days');

  const daysData = [
    { day: 'Mon', count: 18, height: '52%' },
    { day: 'Tue', count: 21, height: '68%' },
    { day: 'Wed', count: 22, height: '76%' },
    { day: 'Thu', count: 20, height: '64%' },
    { day: 'Fri', count: 25, height: '94%' }, // Active bar
    { day: 'Sat', count: 12, height: '36%' },
    { day: 'Sun', count: 8, height: '24%' },
  ];

  return (
    <BentoCard className="p-6 md:p-8 bg-white border border-neutral-200/80 shadow-bento rounded-3xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-6">
        <div>
          <h4 className="text-base font-bold text-neutral-900">
            Attendance Flow
          </h4>
          <p className="text-xs text-neutral-400">Weekly check-in distribution</p>
        </div>

        <div className="relative inline-flex items-center">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="appearance-none bg-white border border-neutral-200/90 rounded-full pl-4 pr-8 py-1.5 text-xs font-semibold text-neutral-800 shadow-xs hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer transition-all"
          >
            <option value="Last 7 days">Last 7 days</option>
            <option value="Last 14 days">Last 14 days</option>
            <option value="This month">This month</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-500 absolute right-3 pointer-events-none stroke-[2]" />
        </div>
      </div>

      {/* Main Grid: Metric on left, vertical bars on right */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-4">
        {/* Large Metric on bottom left */}
        <div className="pb-2">
          <span className="text-4xl sm:text-5xl font-extrabold text-neutral-900 tracking-tight">
            98.4%
          </span>
          <p className="text-xs font-semibold text-neutral-400 mt-1">
            Avg On-time attendance rate
          </p>
        </div>

        {/* Vertical Bars Container */}
        <div className="flex items-end justify-end gap-3 sm:gap-4 h-48">
          {daysData.map((item, index) => {
            const isActive = index === activeDay;
            return (
              <div
                key={item.day}
                className="flex flex-col items-center gap-2 h-full justify-end group cursor-pointer"
                onClick={() => setActiveDay(index)}
              >
                {/* Floating pill badge like "2.2m" in reference image */}
                {isActive ? (
                  <div className="relative -mb-1 animate-in fade-in duration-200">
                    <div className="bg-[#111827] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      2.2m
                    </div>
                    <div className="w-1.5 h-1.5 bg-[#111827] rotate-45 mx-auto -mt-0.5" />
                  </div>
                ) : (
                  <div className="h-5" /> // Spacer for consistent bar height alignment
                )}

                {/* Pill Bar */}
                <div className="w-8 sm:w-10 h-36 bg-transparent flex items-end justify-center">
                  <div
                    style={{ height: item.height }}
                    className={`w-full rounded-full transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-sm'
                        : 'bg-neutral-200/80 group-hover:bg-neutral-300'
                    }`}
                  />
                </div>

                <span
                  className={`text-xs font-semibold transition-colors ${
                    isActive ? 'text-neutral-900 font-bold' : 'text-neutral-400'
                  }`}
                >
                  {item.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </BentoCard>
  );
});

AttendanceChart.displayName = 'AttendanceChart';
