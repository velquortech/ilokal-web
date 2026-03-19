import { createColumnHelper, ColumnDef } from '@tanstack/react-table';
import { Profile } from '@/lib/types/user';
import { AvatarImage } from '@/components/custom/AvatarImage';
import { getTimeAgo, formatDateShort } from '@/lib/utils/dateFormatter';
import { toast } from 'sonner';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RotateCcw } from 'lucide-react';

const columnHelper = createColumnHelper<Profile>();

export interface AccountStatusColumnsProps {
  currentPage: number;
  isSubmitting: boolean;
  onRestore?: (userId: string, userName: string) => void;
  onReactivate?: (userId: string, userName: string) => void;
  accountType: 'archived' | 'suspended' | 'inactive';
}

/**
 * Creates columns for Account Status table
 * Displays Profile data with restore/reactivate actions
 */
export const createAccountStatusColumns = ({
  currentPage,
  isSubmitting,
  onRestore,
  onReactivate,
  accountType,
}: AccountStatusColumnsProps): ColumnDef<Profile>[] =>
  [
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
      cell: (info) =>
        info.row.original.avatar_url
          ? React.createElement(AvatarImage, {
              src: info.row.original.avatar_url,
              alt: info.row.original.full_name || 'Avatar',
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
              info.row.original.full_name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || 'N/A',
            ),
      enableSorting: false,
      size: 60,
    }),
    columnHelper.display({
      id: 'full_name',
      header: 'Name',
      cell: (info) =>
        React.createElement(
          'span',
          { className: 'font-medium' },
          info.row.original.full_name || '-',
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
    columnHelper.display({
      id: 'statusDate',
      header:
        accountType === 'archived'
          ? 'Archived Date'
          : accountType === 'suspended'
            ? 'Last Updated'
            : 'Last Updated',
      cell: (info) => {
        const user = info.row.original;
        let dateStr = '';

        if (accountType === 'archived' && user.archived_at) {
          dateStr = formatDateShort(user.archived_at);
        } else {
          dateStr = getTimeAgo(user.updated_at);
        }

        return React.createElement(
          'span',
          { className: 'text-sm text-gray-600' },
          dateStr,
        );
      },
      enableSorting: false,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const user = info.row.original;
        const displayName = user.full_name || user.email;

        return React.createElement(
          'div',
          { className: 'flex justify-end gap-2' },
          // Restore button - only for archived users
          accountType === 'archived' && onRestore
            ? React.createElement(
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
                        onRestore(user.id, displayName);
                        toast.info(`Restoring ${displayName}`);
                      },
                      disabled: isSubmitting,
                      className: 'cursor-pointer gap-1',
                      'aria-label': `Restore user ${displayName}`,
                    },
                    React.createElement(RotateCcw, { className: 'h-3 w-3' }),
                    'Restore',
                  ),
                ),
                React.createElement(
                  TooltipContent,
                  {
                    side: 'top',
                    className: 'border-slate-700 bg-slate-950 text-white',
                  },
                  React.createElement(
                    'p',
                    { className: 'text-sm' },
                    'Restore to active status',
                  ),
                ),
              )
            : null,

          // Reactivate button - for suspended and inactive users
          (accountType === 'suspended' || accountType === 'inactive') &&
            onReactivate
            ? React.createElement(
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
                        onReactivate(user.id, displayName);
                        toast.info(`Reactivating ${displayName}`);
                      },
                      disabled: isSubmitting,
                      className: 'cursor-pointer gap-1',
                      'aria-label': `Reactivate user ${displayName}`,
                    },
                    React.createElement(RotateCcw, { className: 'h-3 w-3' }),
                    'Reactivate',
                  ),
                ),
                React.createElement(
                  TooltipContent,
                  {
                    side: 'top',
                    className: 'border-slate-700 bg-slate-950 text-white',
                  },
                  React.createElement(
                    'p',
                    { className: 'text-sm' },
                    'Reactivate to active status',
                  ),
                ),
              )
            : null,
        );
      },
      enableSorting: false,
      size: 120,
    }),
  ] as const as unknown as ColumnDef<Profile>[];

export const columnNames: Record<string, string> = {
  full_name: 'Name',
  email: 'Email',
  phone_number: 'Phone',
  statusDate: 'Status Date',
};
