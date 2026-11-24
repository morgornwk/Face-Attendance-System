import React, { useState, useCallback } from 'react';
import { Sidebar, NavTab } from '../shared/components/layout/Sidebar';
import { Header } from '../shared/components/layout/Header';
import { ToastProvider, useToast } from '../shared/components/ui/Toast';

// Features
import { AttendanceDashboard } from '../features/attendance/components/AttendanceDashboard';
import { AttendanceMasterView } from '../features/attendance/components/AttendanceMasterView';
import { AttendanceHistoryModal } from '../features/attendance/components/AttendanceHistoryModal';
import { EmployeeCalendarModal } from '../features/attendance/components/EmployeeCalendarModal';
import { EmployeeList } from '../features/employees/components/EmployeeList';
import { EmployeeFormModal } from '../features/employees/components/EmployeeFormModal';
import { FaceRegisterModal } from '../features/employees/components/FaceRegisterModal';
import { SystemDiagnosticsView } from '../features/system/components/SystemDiagnosticsView';

// Hooks & Types
import { useEmployees } from '../features/employees/hooks/useEmployees';
import { useAttendanceWebSocket } from '../features/attendance/hooks/useAttendanceWebSocket';
import { useSystemHealth } from '../features/system/hooks/useSystemHealth';
import { Employee } from '../shared/types/employee';

const MainApp: React.FC = () => {
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

  // Business Handlers
  const handleCreateEmployee = useCallback(async (data: any) => {
    try {
      const created = await createEmployee(data);
      showToast(`Employee ${created.full_name} created successfully!`, 'success');
      setIsCreateOpen(false);
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
        <Header
          title={pageTitle}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenRegisterModal={() => setIsCreateOpen(true)}
        />

        {/* Feature Views */}
        {activeTab === 'dashboard' && (
          <AttendanceDashboard
            employees={employees}
            events={events}
            wsStatus={wsStatus}
            health={health}
            isHealthChecking={isHealthChecking}
            healthError={healthError}
            onOpenCreate={() => setIsCreateOpen(true)}
            onOpenFaceModal={(emp) => setFaceEmployee(emp)}
            onOpenHistoryModal={(emp) => {
              setHistoryEmployee(emp || null);
              setIsHistoryOpen(true);
            }}
            onNavigateEmployees={() => setActiveTab('employees')}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeeList
            employees={employees}
            isLoading={isEmployeesLoading}
            onOpenCreateModal={() => setIsCreateOpen(true)}
            onOpenEditModal={(emp) => setEditingEmployee(emp)}
            onOpenFaceModal={(emp) => setFaceEmployee(emp)}
            onDeactivate={handleDeactivateEmployee}
            onSelectForHistory={(emp) => {
              setHistoryEmployee(emp);
              setIsHistoryOpen(true);
            }}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendanceMasterView
            employees={employees}
            events={events}
            onOpenCalendarModal={(emp) => setCalendarEmployee(emp)}
          />
        )}

        {activeTab === 'system' && (
          <SystemDiagnosticsView
            health={health}
            isChecking={isHealthChecking}
            error={healthError}
            events={events}
            wsStatus={wsStatus}
            onOpenHistoryModal={(emp) => {
              setHistoryEmployee(emp || null);
              setIsHistoryOpen(true);
            }}
          />
        )}
      </main>

      {/* Modals from Features */}
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
      <MainApp />
    </ToastProvider>
  );
};

export default App;

