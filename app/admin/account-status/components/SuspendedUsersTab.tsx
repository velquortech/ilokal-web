import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Profile } from '@/lib/types/user';
import { UserTable } from './UserTable';

interface SuspendedUsersTabProps {
  users: Profile[];
  loading: boolean;
  onReactivate: (userId: string, userName: string) => void;
}

export function SuspendedUsersTab({
  users,
  loading,
  onReactivate,
}: SuspendedUsersTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Suspended Users</CardTitle>
        <CardDescription>
          Accounts suspended by admin action. Can be reactivated.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <UserTable
          users={users}
          loading={loading}
          onReactivate={onReactivate}
          showReactivateButton
        />
      </CardContent>
    </Card>
  );
}
