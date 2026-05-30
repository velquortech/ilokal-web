'use client';

import { useMemo } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import type { Profile } from '@/lib/types/user';
import { PaginatedResponse } from '@/lib/services';
import UsersTable from '@/app/admin/components/shared/UsersTable';
import { createAccountStatusColumns } from './columns';

interface SuspendedUsersTabProps {
  data: PaginatedResponse<Profile> | null;
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  isSubmitting: boolean;
  onReactivate: (userId: string, userName: string) => Promise<void>;
}

export function SuspendedUsersTab({
  data,
  isLoading,
  currentPage,
  onPageChange,
  isSubmitting,
  onReactivate,
}: SuspendedUsersTabProps) {
  const columns = useMemo(
    () =>
      createAccountStatusColumns({
        currentPage,
        isSubmitting,
        onReactivate,
        accountType: 'suspended',
      }),
    [currentPage, isSubmitting, onReactivate],
  );

  return (
    <TabsContent value="suspended" className="space-y-4">
      <UsersTable<Profile>
        data={data}
        isLoading={isLoading}
        currentPage={currentPage}
        onPageChange={onPageChange}
        columns={columns}
        isSubmitting={isSubmitting}
        showDeleteConfirmation={false}
      />
    </TabsContent>
  );
}
