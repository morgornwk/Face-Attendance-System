import React, { useState } from 'react';
import { Sidebar, NavTab } from '../shared/components/layout/Sidebar';
import { Header } from '../shared/components/layout/Header';
import { ToastProvider } from '../shared/components/ui/Toast';
import { AttendanceDashboard } from '../features/attendance/components/AttendanceDashboard';
import { AttendanceMasterView } from '../features/attendance/components/AttendanceMasterView';
import { EmployeeList } from '../features/employees/components/EmployeeList';
import { SystemDiagnosticsView } from '../features/system/components/SystemDiagnosticsView';

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  const pageTitle =
    activeTab === 'dashboard'
      ? 'Dashboard'
      : activeTab === 'employees'
      ? 'Employee Registry'
      : activeTab === 'attendance'
      ? 'Attendance & Monthly Tracker'
      : 'System Diagnostics';

  return (
    <div className="flex min-h-screen bg-[#F4F5F6]">
      {/* Navigation Layout */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 p-6 lg:p-8 xl:p-10 overflow-x-hidden max-w-[1560px] w-full">
        <Header title={pageTitle} />

        {/* Feature Views */}
        {activeTab === 'dashboard' && (
          <AttendanceDashboard onNavigateEmployees={() => setActiveTab('employees')} />
        )}
        {activeTab === 'employees' && <EmployeeList />}
        {activeTab === 'attendance' && <AttendanceMasterView />}
        {activeTab === 'system' && <SystemDiagnosticsView />}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
};

export default App;
