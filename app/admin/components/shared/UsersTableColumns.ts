import { createColumnHelper } from '@tanstack/react-table';
import { AdminUser } from '@/lib/types/admin';
import { AvatarImage } from '@/components/custom/AvatarImage';
import { getTimeAgo } from '@/lib/utils/dateFormatter';
import { StatusDropdown } from '../forms/fields/StatusDropdown';
import { toast } from 'sonner';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Edit2, Trash2 } from 'lucide-react';

export const columnHelper = createColumnHelper<AdminUser>();

export interface UsersTableColumnsProps {
  currentPage: number;
  isSubmitting: boolean;
  onEdit: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  onStatusChange?: (updatedUser: AdminUser) => void;
  onError: (error: string | null) => void;
}

export const createUsersTableColumns = ({
  currentPage,
  isSubmitting,
  onEdit,
  onDelete,
  onStatusChange,
  onError,
}: UsersTableColumnsProps) => [
  columnHelper.display({
    id: 'index',
    header: '#',
    cell: (info) => (currentPage - 1) * 10 + info.row.index + 1,
    enableSorting: false,
    size: 50,
  }),
  columnHelper.display({
    id: 'avatar',
    header: 'Avatar',
    cell: (info) => {
      const user = info.row.original;
      return user.avatar_url
        ? React.createElement(AvatarImage, {
            src: user.avatar_url,
            alt: user.full_name || 'Avatar',
            width: 40,
            height: 40,
            className: 'h-10 w-10 rounded-full object-cover',
          })
        : React.createElement(
            'div',
            {
              className:
                'flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600',
            },
            user.full_name
              ?.split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'N/A',
          );
    },
    enableSorting: false,
    size: 60,
  }),
  columnHelper.accessor('full_name', {
    header: 'Name',
    cell: (info) =>
      React.createElement(
        'span',
        { className: 'font-medium' },
        info.getValue(),
      ),
    enableSorting: true,
  }),
  columnHelper.accessor('email', {
    header: 'Email',
    cell: (info) =>
      React.createElement(
        'span',
        { className: 'text-sm text-gray-600' },
        info.getValue(),
      ),
    enableSorting: true,
  }),
  columnHelper.accessor('phone_number', {
    header: 'Phone',
    cell: (info) =>
      React.createElement(
        'span',
        { className: 'text-sm text-gray-600' },
        info.getValue() || '-',
      ),
    enableSorting: true,
  }),
  columnHelper.accessor('created_at', {
    header: 'Created',
    cell: (info) =>
      React.createElement(
        'span',
        { className: 'text-sm text-gray-600' },
        getTimeAgo(info.getValue()),
      ),
    enableSorting: true,
  }),
  columnHelper.accessor('updated_at', {
    header: 'Updated',
    cell: (info) =>
      React.createElement(
        'span',
        { className: 'text-sm text-gray-600' },
        getTimeAgo(info.getValue()),
      ),
    enableSorting: true,
  }),
  columnHelper.display({
    id: 'status',
    header: 'Status',
    cell: (info) =>
      React.createElement(StatusDropdown, {
        admin: info.row.original,
        onStatusChange,
        onError,
      }),
    enableSorting: false,
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: (info) => {
      const user = info.row.original;
      return React.createElement(
        'div',
        { className: 'flex justify-end gap-2' },
        React.createElement(
          Tooltip,
          { delayDuration: 200 },
          React.createElement(
            TooltipTrigger,
            { asChild: true },
            React.createElement(
              Button,
              {
                size: 'sm',
                variant: 'outline',
                onClick: () => {
                  onEdit(user);
                  const displayName = user.full_name || user.email || 'User';
                  toast.info(`Editing ${displayName}`);
                },
                disabled: isSubmitting,
                className: 'cursor-pointer gap-1',
                'aria-label': `Edit user ${user.full_name || user.email || 'this user'}`,
              },
              React.createElement(Edit2, { className: 'h-3 w-3' }),
            ),
          ),
          React.createElement(
            TooltipContent,
            {
              side: 'top',
              className: 'border-slate-700 bg-slate-950 text-white',
            },
            React.createElement('p', { className: 'text-sm' }, 'Edit'),
          ),
        ),
        React.createElement(
          Tooltip,
          { delayDuration: 200 },
          React.createElement(
            TooltipTrigger,
            { asChild: true },
            React.createElement(
              Button,
              {
                size: 'sm',
                variant: 'outline',
                onClick: () => onDelete(user),
                disabled: isSubmitting,
                className: 'cursor-pointer text-red-600 hover:text-red-700',
                'aria-label': `Delete ${
                  user.full_name
                    ? `user ${user.full_name}`
                    : user.email
                      ? `user with email ${user.email}`
                      : 'this user'
                }`,
              },
              React.createElement(Trash2, { className: 'h-3 w-3' }),
            ),
          ),
          React.createElement(
            TooltipContent,
            {
              side: 'top',
              className: 'border-slate-700 bg-slate-950 text-white',
            },
            React.createElement('p', { className: 'text-sm' }, 'Delete'),
          ),
        ),
      );
    },
    enableSorting: false,
    size: 100,
  }),
];

export const columnNames: Record<string, string> = {
  full_name: 'Name',
  email: 'Email',
  phone_number: 'Phone',
  created_at: 'Created',
  updated_at: 'Updated',
  status: 'Status',
};
