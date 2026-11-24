import React from 'react';
import { cn } from '../../utils/cn';

interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  children,
  className,
  interactive = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-white rounded-3xl p-6 border border-neutral-200/70 shadow-bento transition-all duration-200',
        interactive && 'hover:shadow-bento-hover hover:border-neutral-300 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
