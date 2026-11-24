import React, { useState, useCallback } from 'react';
import { Sidebar, NavTab } from '../shared/components/layout/Sidebar';
import { Header } from '../shared/components/layout/Header';
import { ToastProvider, useToast } from '../shared/components/ui/Toast';
import { AttendanceStatsCards } from '../features/attendance/components/AttendanceStatsCards';
import { AttendanceChart } from '../features/attendance/components/AttendanceChart';
import { LiveAttendanceFeed } from '../features/attendance/components/LiveAttendanceFeed';
import { AttendanceHistoryModal } from '../features/attendance/components/AttendanceHistoryModal';
import { AttendanceMasterView } from '../features/attendance/components/AttendanceMasterView';
import { EmployeeCalendarModal } from '../features/attendance/components/EmployeeCalendarModal';
import { EmployeeList } from '../features/employees/components/EmployeeList';
import { EmployeeFormModal } from '../features/employees/components/EmployeeFormModal';
import { FaceRegisterModal } from '../features/employees/components/FaceRegisterModal';
import { SystemStatusCard } from '../features/system/components/SystemStatusCard';
import { useEmployees } from '../features/employees/hooks/useEmployees';
import { useAttendanceWebSocket } from '../features/attendance/hooks/useAttendanceWebSocket';
import { useSystemHealth } from '../features/system/hooks/useSystemHealth';
import { Employee } from '../shared/types/employee';

const MainDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();

  // Core Hooks
  const {
    employees,
    isLoading: isEmployeesLoading,
    createEmployee,
    updateEmployee,
    deactivateEmployee,
    registerFace,
  } = useEmployees();

  const { status: wsStatus, events } = useAttendanceWebSocket();
  const { health, isChecking: isHealthChecking, error: healthError } = useSystemHealth();

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [faceEmployee, setFaceEmployee] = useState<Employee | null>(null);
  const [historyEmployee, setHistoryEmployee] = useState<Employee | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [calendarEmployee, setCalendarEmployee] = useState<Employee | null>(null);

  // Handlers
  const handleCreateEmployee = useCallback(async (data: any) => {
    try {
      const created = await createEmployee(data);
      showToast(`Employee ${created.full_name} created successfully!`, 'success');
      setIsCreateOpen(false);
      // Prompt to register face right away
      setFaceEmployee(created);
    } catch (err: any) {
      showToast(err?.message || 'Failed to create employee', 'error');
    }
  }, [createEmployee, showToast]);

  const handleUpdateEmployee = useCallback(async (data: any) => {
    if (!editingEmployee) return;
    try {
      await updateEmployee(editingEmployee.id, data);
      showToast('Employee updated successfully', 'success');
      setEditingEmployee(null);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update employee', 'error');
    }
  }, [editingEmployee, updateEmployee, showToast]);

  const handleDeactivateEmployee = useCallback(async (id: string) => {
    try {
      await deactivateEmployee(id);
      showToast('Employee deactivated successfully', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to deactivate employee', 'error');
    }
  }, [deactivateEmployee, showToast]);

  const handleRegisterFace = useCallback(async (id: string, file: File) => {
    try {
      const res = await registerFace(id, file);
      showToast('Face biometric registered successfully!', 'success');
      return res;
    } catch (err: any) {
      showToast(err?.message || 'Face registration failed', 'error');
      throw err;
    }
  }, [registerFace, showToast]);

  const handleOpenHistory = useCallback((emp?: Employee) => {
    setHistoryEmployee(emp || null);
    setIsHistoryOpen(true);
  }, []);

  const handleOpenCalendar = useCallback((emp: Employee) => {
    setCalendarEmployee(emp);
  }, []);

  const handleOpenFaceModal = useCallback((emp: Employee) => {
    setFaceEmployee(emp);
  }, []);

  const handleOpenEditModal = useCallback((emp: Employee) => {
    setEditingEmployee(emp);
  }, []);

  const handleOpenCreateModal = useCallback(() => {
    setIsCreateOpen(true);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F4F5F6]">
      {/* Left Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 p-6 lg:p-8 xl:p-10 overflow-x-hidden max-w-[1560px] w-full">
        <Header
          title={
            activeTab === 'dashboard'
              ? 'Dashboard'
              : activeTab === 'employees'
              ? 'Employee Registry'
              : activeTab === 'attendance'
              ? 'Attendance & Monthly Tracker'
              : 'System Diagnostics'
          }
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenRegisterModal={handleOpenCreateModal}
        />

        {/* Tab 1: Dashboard (Bento Grid matching reference) */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left 2 Columns: Overview Stats & Chart */}
            <div className="xl:col-span-8 flex flex-col gap-6">
              <AttendanceStatsCards
                employees={employees}
                events={events}
                onOpenDirectory={() => setActiveTab('employees')}
                onOpenCreate={handleOpenCreateModal}
                onOpenFaceModal={handleOpenFaceModal}
              />

              <AttendanceChart />
            </div>

            {/* Right Column: Live Stream & System Health */}
            <div className="xl:col-span-4 flex flex-col gap-6">
              <LiveAttendanceFeed
                events={events}
                employees={employees}
                wsStatus={wsStatus}
                onOpenHistoryModal={handleOpenHistory}
              />

              <SystemStatusCard
                health={health}
                isChecking={isHealthChecking}
                error={healthError}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Employees Directory */}
        {activeTab === 'employees' && (
          <div className="space-y-6">
            <EmployeeList
              employees={employees}
              isLoading={isEmployeesLoading}
              onOpenCreateModal={handleOpenCreateModal}
              onOpenEditModal={handleOpenEditModal}
              onOpenFaceModal={handleOpenFaceModal}
              onDeactivate={handleDeactivateEmployee}
              onSelectForHistory={handleOpenHistory}
            />
          </div>
        )}

        {/* Tab 3: Organization Attendance Directory & Tracker */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <AttendanceMasterView
              employees={employees}
              events={events}
              onOpenCalendarModal={handleOpenCalendar}
            />
          </div>
        )}

        {/* Tab 4: System Health */}
        {activeTab === 'system' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SystemStatusCard
              health={health}
              isChecking={isHealthChecking}
              error={healthError}
            />
            <LiveAttendanceFeed
              events={events}
              wsStatus={wsStatus}
              onOpenHistoryModal={handleOpenHistory}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <EmployeeFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateEmployee}
      />

      <EmployeeFormModal
        isOpen={Boolean(editingEmployee)}
        onClose={() => setEditingEmployee(null)}
        onSubmit={handleUpdateEmployee}
        employee={editingEmployee}
      />

      <FaceRegisterModal
        isOpen={Boolean(faceEmployee)}
        onClose={() => setFaceEmployee(null)}
        employee={faceEmployee}
        onRegisterFace={handleRegisterFace}
      />

      <AttendanceHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        employees={employees}
        initialEmployee={historyEmployee}
      />

      <EmployeeCalendarModal
        isOpen={Boolean(calendarEmployee)}
        onClose={() => setCalendarEmployee(null)}
        employee={calendarEmployee}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <MainDashboard />
    </ToastProvider>
  );
};

export default App;
