import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Activity,
  Sparkles,
  Sun,
  LifeBuoy,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export type NavTab = 'dashboard' | 'employees' | 'attendance' | 'system';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'employees' as NavTab, label: 'Employees', icon: Users },
    { id: 'attendance' as NavTab, label: 'Attendance', icon: CalendarCheck },
    { id: 'system' as NavTab, label: 'System Health', icon: Activity },
  ];

  return (
    <aside className="w-64 h-screen sticky top-0 bg-transparent flex flex-col justify-between p-6 shrink-0 border-r border-neutral-200/60 select-none overflow-y-auto">
      <div className="space-y-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-2xl bg-[#111827] text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-neutral-900 leading-none">
              AuraAttend
            </h1>
            <span className="text-[11px] font-medium text-neutral-400">
              Face Recognition System
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          <p className="px-3 text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
            Main Menu
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  'w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-150',
                  isActive
                    ? 'bg-white text-neutral-900 shadow-bento border border-neutral-200/70'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/40'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isActive ? 'text-neutral-900' : 'text-neutral-400'
                  )}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls */}
      <div className="space-y-2 pt-6 border-t border-neutral-200/60">
        <button
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/40 transition-colors"
          onClick={() => window.open('http://127.0.0.1:8000/docs', '_blank')}
        >
          <LifeBuoy className="w-4 h-4 text-neutral-400" />
          <span>API Documentation</span>
        </button>
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/70 border border-neutral-200/60 shadow-xs">
          <span className="text-xs text-neutral-600 font-semibold flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            System Live
          </span>
          <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Online
          </span>
        </div>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';
