import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Profile } from '@/lib/types/user';
import { UserTable } from './UserTable';

interface ArchivedUsersTabProps {
  users: Profile[];
  loading: boolean;
  onRestore: (userId: string, userName: string) => void;
}

export function ArchivedUsersTab({
  users,
  loading,
  onRestore,
}: ArchivedUsersTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Archived Users</CardTitle>
        <CardDescription>
          Soft deleted accounts. Can be restored to active status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <UserTable
          users={users}
          loading={loading}
          onRestore={onRestore}
          showArchiveDate
          showRestoreButton
        />
      </CardContent>
    </Card>
  );
}
