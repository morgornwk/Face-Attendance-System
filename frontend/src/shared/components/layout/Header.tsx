import React from 'react';
import { Search, Plus, Bell, MessageSquare } from 'lucide-react';
import { Button } from '../ui/Button';

interface HeaderProps {
  title: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenRegisterModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  searchQuery,
  onSearchChange,
  onOpenRegisterModal,
}) => {
  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        {/* Search bar matching reference */}
        <div className="relative flex-1 sm:w-72">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search anything..."
            className="w-full bg-white border border-neutral-200/80 rounded-full pl-10 pr-4 py-2 text-xs text-neutral-800 placeholder:text-neutral-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all"
          />
        </div>

        {/* Primary Action Button: + Create */}
        <Button
          onClick={onOpenRegisterModal}
          size="sm"
          className="shadow-sm font-semibold shrink-0 bg-[#111827] text-white hover:bg-black rounded-full px-4 py-2"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          <span>Create</span>
        </Button>

        {/* Round Icon Button: Bell */}
        <button
          className="w-9 h-9 rounded-full bg-white border border-neutral-200/80 flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 shadow-sm transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Round Icon Button: Message */}
        <button
          className="w-9 h-9 rounded-full bg-white border border-neutral-200/80 flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 shadow-sm transition-colors"
          title="Messages"
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        {/* Profile Avatar Portrait */}
        <div className="w-9 h-9 rounded-full overflow-hidden border border-neutral-200 shadow-sm shrink-0">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80"
            alt="Admin Profile"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
};
