import React from 'react';

export interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'suspended';
}

const statusConfig = {
  active: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    dot: 'bg-green-500',
  },
  inactive: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    dot: 'bg-gray-500',
  },
  suspended: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    dot: 'bg-red-500',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${config.bg}`}
    >
      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
      <span className={`text-sm font-medium capitalize ${config.text}`}>
        {status}
      </span>
    </div>
  );
}
