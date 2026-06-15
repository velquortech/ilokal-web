'use client';

import { useMemo } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import type { Profile } from '@/lib/types/user';
import { PaginatedResponse } from '@/lib/services';
import UsersTable from '@/app/admin/[adminId]/components/shared/UsersTable';
import { createAccountStatusColumns } from './columns';

interface ArchivedUsersTabProps {
  data: PaginatedResponse<Profile> | null;
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  isSubmitting: boolean;
  onRestore: (userId: string, userName: string) => Promise<void>;
}

export function ArchivedUsersTab({
  data,
  isLoading,
  currentPage,
  onPageChange,
  isSubmitting,
  onRestore,
}: ArchivedUsersTabProps) {
  const columns = useMemo(
    () =>
      createAccountStatusColumns({
        currentPage,
        isSubmitting,
        onRestore,
        accountType: 'archived',
      }),
    [currentPage, isSubmitting, onRestore],
  );

  return (
    <TabsContent value="archived" className="space-y-4">
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
