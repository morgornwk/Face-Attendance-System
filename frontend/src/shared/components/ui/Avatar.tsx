import React, { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { getInitials } from '../../utils/formatters';
import { Employee } from '../../types/employee';
import {
  getEmployeeFacePhoto,
  markAvatarUrlFailed,
  isAvatarUrlFailed,
} from '../../utils/avatarHelper';

interface AvatarProps {
  employee?: Employee | null;
  name?: string | null;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isOnline?: boolean;
}

const SIZES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm font-semibold',
  lg: 'w-14 h-14 text-base font-bold',
  xl: 'w-16 h-16 text-lg font-bold',
};

export const Avatar: React.FC<AvatarProps> = React.memo(({
  employee,
  name,
  src,
  size = 'md',
  className,
  isOnline,
}) => {
  const photoFromEmployee = employee ? getEmployeeFacePhoto(employee) : null;
  const initialSrc = src || photoFromEmployee;
  const isBroken = isAvatarUrlFailed(initialSrc);

  const [hasError, setHasError] = useState(isBroken);

  // If source changes and was not failed, reset error
  useEffect(() => {
    setHasError(isAvatarUrlFailed(initialSrc));
  }, [initialSrc]);

  const displayName = employee ? employee.full_name : name;

  const handleError = () => {
    if (initialSrc) {
      markAvatarUrlFailed(initialSrc);
    }
    setHasError(true);
  };

  const showImage = Boolean(initialSrc) && !hasError;

  return (
    <div className="relative inline-block shrink-0">
      {showImage ? (
        <img
          src={initialSrc!}
          alt={displayName || 'Avatar'}
          loading="lazy"
          decoding="async"
          onError={handleError}
          className={cn(
            'rounded-full object-cover border border-neutral-200/90 shadow-sm transition-transform duration-150',
            SIZES[size],
            className
          )}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-bold tracking-tight select-none',
            'bg-neutral-100 text-neutral-800 border border-neutral-200 shadow-sm',
            SIZES[size],
            className
          )}
        >
          {getInitials(displayName)}
        </div>
      )}
      {isOnline !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-white',
            size === 'xs' || size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3',
            isOnline ? 'bg-emerald-500' : 'bg-neutral-300'
          )}
        />
      )}
    </div>
  );
});

Avatar.displayName = 'Avatar';
