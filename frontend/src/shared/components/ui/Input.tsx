import React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full bg-neutral-50/80 border border-neutral-200 text-neutral-900 text-sm rounded-2xl px-4 py-2.5 transition-all duration-150',
              'focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent',
              'placeholder:text-neutral-400',
              icon && 'pl-10',
              error && 'border-rose-400 focus:ring-rose-500 bg-rose-50/30',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-rose-500 font-medium pl-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
