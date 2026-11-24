import React, { useState, useCallback } from 'react';
import {
  Search,
  ScanFace,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
} from 'lucide-react';
import { BentoCard } from '../../../shared/components/ui/BentoCard';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { Avatar } from '../../../shared/components/ui/Avatar';
import { Employee } from '../../../shared/types/employee';
import { useEmployees } from '../hooks/useEmployees';
import { useToast } from '../../../shared/components/ui/Toast';
import { EmployeeFormModal } from './EmployeeFormModal';
import { FaceRegisterModal } from './FaceRegisterModal';
import { AttendanceHistoryModal } from '../../attendance/components/AttendanceHistoryModal';

interface EmployeeListProps {
  employees?: Employee[];
  isLoading?: boolean;
  onOpenCreateModal?: () => void;
  onOpenEditModal?: (emp: Employee) => void;
  onOpenFaceModal?: (emp: Employee) => void;
  onDeactivate?: (id: string) => Promise<void>;
  onSelectForHistory?: (emp: Employee) => void;
}

interface EmployeeRowProps {
  emp: Employee;
  onOpenEditModal: (emp: Employee) => void;
  onOpenFaceModal: (emp: Employee) => void;
  onDeactivate: (id: string) => Promise<void>;
  onSelectForHistory?: (emp: Employee) => void;
}

const EmployeeRow = React.memo<EmployeeRowProps>(({
  emp,
  onOpenEditModal,
  onOpenFaceModal,
  onDeactivate,
  onSelectForHistory,
}) => {
  return (
    <tr className="hover:bg-neutral-50/70 transition-colors group">
      <td className="py-3.5 px-3">
        <div className="flex items-center gap-3">
          <Avatar employee={emp} size="sm" />
          <div className="min-w-0">
            <p className="font-bold text-neutral-900 group-hover:text-black truncate">
              {emp.full_name}
            </p>
            <p className="text-[11px] font-mono text-neutral-400">
              {emp.employee_code}
            </p>
          </div>
        </div>
      </td>

      <td className="py-3.5 px-3">
        <p className="text-xs font-medium text-neutral-800">
          {emp.position}
        </p>
        <p className="text-[11px] text-neutral-400">
          {emp.department}
        </p>
      </td>

      <td className="py-3.5 px-3">
        {emp.face_registered ? (
          <Badge variant="success" size="sm">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Registered
          </Badge>
        ) : (
          <Badge variant="warning" size="sm">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            Pending Face
          </Badge>
        )}
      </td>

      <td className="py-3.5 px-3">
        <Badge
          variant={emp.is_active ? 'info' : 'neutral'}
          size="sm"
        >
          {emp.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </td>

      <td className="py-3.5 px-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => onOpenFaceModal(emp)}
            title="Register Face Embedding"
            className="p-1.5 rounded-xl hover:bg-neutral-200/80 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ScanFace className="w-4 h-4" />
          </button>

          <button
            onClick={() => onOpenEditModal(emp)}
            title="Edit Details"
            className="p-1.5 rounded-xl hover:bg-neutral-200/80 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          {onSelectForHistory && (
            <button
              onClick={() => onSelectForHistory(emp)}
              title="View Attendance Records"
              className="px-2 py-1 rounded-xl text-[11px] font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
            >
              Logs
            </button>
          )}

          <button
            onClick={() => {
              if (confirm(`Are you sure you want to deactivate ${emp.full_name}?`)) {
                onDeactivate(emp.id);
              }
            }}
            title="Deactivate Employee"
            className="p-1.5 rounded-xl hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

EmployeeRow.displayName = 'EmployeeRow';

export const EmployeeList: React.FC<EmployeeListProps> = ({
  employees: propEmployees,
  isLoading: propIsLoading,
  onOpenCreateModal: propOnOpenCreate,
  onOpenEditModal: propOnOpenEdit,
  onOpenFaceModal: propOnOpenFace,
  onDeactivate: propOnDeactivate,
  onSelectForHistory: propOnSelectForHistory,
}) => {
  const internalHooks = useEmployees();
  const { showToast } = useToast();

  const employees = propEmployees ?? internalHooks.employees;
  const isLoading = propIsLoading ?? internalHooks.isLoading;

  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const [internalEditingEmp, setInternalEditingEmp] = useState<Employee | null>(null);
  const [internalFaceEmp, setInternalFaceEmp] = useState<Employee | null>(null);
  const [internalHistoryEmp, setInternalHistoryEmp] = useState<Employee | null>(null);
  const [internalHistoryOpen, setInternalHistoryOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('All');

  const handleCreate = propOnOpenCreate || (() => setInternalCreateOpen(true));
  const handleEdit = propOnOpenEdit || ((emp: Employee) => setInternalEditingEmp(emp));
  const handleFace = propOnOpenFace || ((emp: Employee) => setInternalFaceEmp(emp));
  const handleHistory = propOnSelectForHistory || ((emp: Employee) => {
    setInternalHistoryEmp(emp);
    setInternalHistoryOpen(true);
  });
  const handleDeactivate = propOnDeactivate || (async (id: string) => {
    try {
      await internalHooks.deactivateEmployee(id);
      showToast('Employee deactivated successfully', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to deactivate employee', 'error');
    }
  });

  const handleInternalCreateSubmit = useCallback(async (data: any) => {
    try {
      const created = await internalHooks.createEmployee(data);
      showToast(`Employee ${created.full_name} created successfully!`, 'success');
      setInternalCreateOpen(false);
      setInternalFaceEmp(created);
    } catch (err: any) {
      showToast(err?.message || 'Failed to create employee', 'error');
    }
  }, [internalHooks, showToast]);

  const handleInternalEditSubmit = useCallback(async (data: any) => {
    if (!internalEditingEmp) return;
    try {
      await internalHooks.updateEmployee(internalEditingEmp.id, data);
      showToast('Employee updated successfully', 'success');
      setInternalEditingEmp(null);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update employee', 'error');
    }
  }, [internalEditingEmp, internalHooks, showToast]);

  const handleInternalRegisterFace = useCallback(async (id: string, file: File) => {
    try {
      const res = await internalHooks.registerFace(id, file);
      showToast('Face biometric registered successfully!', 'success');
      return res;
    } catch (err: any) {
      showToast(err?.message || 'Face registration failed', 'error');
      throw err;
    }
  }, [internalHooks, showToast]);

  const departments = [
    'All',
    ...Array.from(new Set(employees.map((e) => e.department).filter(Boolean))),
  ];

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      emp.position.toLowerCase().includes(search.toLowerCase());
    const matchesDept =
      selectedDept === 'All' || emp.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <>
      <BentoCard className="p-6">
        {/* Header & Search Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">
              Employee Directory
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Total {employees.length} team members registered
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter by name, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-full pl-9 pr-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <Button size="sm" onClick={handleCreate}>
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </Button>
          </div>
        </div>

        {/* Department Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto py-4 scrollbar-none">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedDept === dept
                  ? 'bg-[#111827] text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Employee Table */}
        <div className="overflow-x-auto transform-gpu">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-neutral-400 text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Department & Position</th>
                <th className="py-3 px-3">Biometrics</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400">
                    <div className="flex justify-center items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-neutral-400 animate-ping" />
                      Loading directory...
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400">
                    No employees found matching filter.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <EmployeeRow
                    key={emp.id}
                    emp={emp}
                    onOpenEditModal={handleEdit}
                    onOpenFaceModal={handleFace}
                    onDeactivate={handleDeactivate}
                    onSelectForHistory={handleHistory}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </BentoCard>

      {!propOnOpenCreate && (
        <EmployeeFormModal
          isOpen={internalCreateOpen}
          onClose={() => setInternalCreateOpen(false)}
          onSubmit={handleInternalCreateSubmit}
        />
      )}

      {!propOnOpenEdit && (
        <EmployeeFormModal
          isOpen={Boolean(internalEditingEmp)}
          onClose={() => setInternalEditingEmp(null)}
          onSubmit={handleInternalEditSubmit}
          employee={internalEditingEmp}
        />
      )}

      {!propOnOpenFace && (
        <FaceRegisterModal
          isOpen={Boolean(internalFaceEmp)}
          onClose={() => setInternalFaceEmp(null)}
          employee={internalFaceEmp}
          onRegisterFace={handleInternalRegisterFace}
        />
      )}

      {!propOnSelectForHistory && (
        <AttendanceHistoryModal
          isOpen={internalHistoryOpen}
          onClose={() => setInternalHistoryOpen(false)}
          employees={employees}
          initialEmployee={internalHistoryEmp}
        />
      )}
    </>
  );
};
