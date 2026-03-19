'use client';

import { useMemo } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import type { Profile } from '@/lib/types/user';
import { PaginatedResponse } from '@/services/api/paginationService';
import UsersTable from '@/app/admin/components/shared/UsersTable';
import { createAccountStatusColumns } from './columns';

interface InactiveUsersTabProps {
  data: PaginatedResponse<Profile>;
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  isSubmitting: boolean;
  onReactivate: (userId: string, userName: string) => Promise<void>;
}

export function InactiveUsersTab({
  data,
  isLoading,
  currentPage,
  onPageChange,
  isSubmitting,
  onReactivate,
}: InactiveUsersTabProps) {
  const columns = useMemo(
    () =>
      createAccountStatusColumns({
        currentPage,
        isSubmitting,
        onReactivate,
        accountType: 'inactive',
      }),
    [currentPage, isSubmitting, onReactivate],
  );

  return (
    <TabsContent value="inactive" className="space-y-4">
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
