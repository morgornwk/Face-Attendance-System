import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { Employee, EmployeeCreatePayload } from '../../../shared/types/employee';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  employee?: Employee | null;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  employee,
}) => {
  const isEditing = Boolean(employee);
  const [formData, setFormData] = useState<EmployeeCreatePayload>({
    employee_code: '',
    full_name: '',
    department: 'Engineering',
    position: 'Software Engineer',
    email: '',
    phone: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (employee) {
      setFormData({
        employee_code: employee.employee_code,
        full_name: employee.full_name,
        department: employee.department,
        position: employee.position,
        email: employee.email || '',
        phone: employee.phone || '',
        notes: employee.notes || '',
      });
    } else {
      setFormData({
        employee_code: `EMP-${Math.floor(100 + Math.random() * 900)}`,
        full_name: '',
        department: 'Engineering',
        position: 'Software Engineer',
        email: '',
        phone: '',
        notes: '',
      });
    }
    setErrorMessage(null);
  }, [employee, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setErrorMessage('Full name is required');
      return;
    }
    if (!formData.employee_code.trim()) {
      setErrorMessage('Employee code is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Employee' : 'New Employee Registration'}
      description={
        isEditing
          ? 'Update employee profile details.'
          : 'Add a new team member to the attendance registry.'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-medium">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Employee Code"
            disabled={isEditing}
            value={formData.employee_code}
            onChange={(e) =>
              setFormData({ ...formData, employee_code: e.target.value.toUpperCase() })
            }
            placeholder="EMP-001"
            required
          />
          <Input
            label="Full Name"
            value={formData.full_name}
            onChange={(e) =>
              setFormData({ ...formData, full_name: e.target.value })
            }
            placeholder="Jane Doe"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider">
              Department
            </label>
            <div className="relative">
              <select
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
                className="w-full appearance-none bg-neutral-50/80 border border-neutral-200 text-neutral-900 text-sm rounded-2xl pl-4 pr-10 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer"
              >
                <option value="Engineering">Engineering</option>
                <option value="Product">Product</option>
                <option value="Design">Design</option>
                <option value="Marketing">Marketing</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
              </select>
              <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <Input
            label="Position"
            value={formData.position}
            onChange={(e) =>
              setFormData({ ...formData, position: e.target.value })
            }
            placeholder="Role title"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            value={formData.email || ''}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value || null })
            }
            placeholder="jane@company.com"
          />
          <Input
            label="Phone"
            value={formData.phone || ''}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value || null })
            }
            placeholder="+66 81 234 5678"
          />
        </div>

        <Input
          label="Notes (Optional)"
          value={formData.notes || ''}
          onChange={(e) =>
            setFormData({ ...formData, notes: e.target.value || null })
          }
          placeholder="Shift details, branch, notes..."
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Employee'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
