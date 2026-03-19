import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Profile } from '@/lib/types/user';
import { UserTable } from './UserTable';

interface InactiveUsersTabProps {
  users: Profile[];
  loading: boolean;
  onReactivate: (userId: string, userName: string) => void;
}

export function InactiveUsersTab({
  users,
  loading,
  onReactivate,
}: InactiveUsersTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inactive Users</CardTitle>
        <CardDescription>
          Disabled accounts that cannot login. Can be reactivated.
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
