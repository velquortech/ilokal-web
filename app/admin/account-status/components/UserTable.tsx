import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw } from 'lucide-react';
import { formatDateShort } from '@/lib/utils/dateFormatter';
import type { Profile } from '@/lib/types/user';

interface UserTableProps {
  users: Profile[];
  loading: boolean;
  onRestore?: (userId: string, userName: string) => void;
  onReactivate?: (userId: string, userName: string) => void;
  showArchiveDate?: boolean;
  showRestoreButton?: boolean;
  showReactivateButton?: boolean;
}

export function UserTable({
  users,
  loading,
  onRestore,
  onReactivate,
  showArchiveDate = false,
  showRestoreButton = false,
  showReactivateButton = false,
}: UserTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">No users found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b">
          <tr>
            <th className="py-2 text-left font-medium">Email</th>
            <th className="py-2 text-left font-medium">Full Name</th>
            {showArchiveDate && (
              <th className="py-2 text-left font-medium">Archived Date</th>
            )}
            {!showArchiveDate && (
              <th className="py-2 text-left font-medium">Date</th>
            )}
            <th className="py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b hover:bg-gray-50">
              <td className="py-3">{user.email}</td>
              <td className="py-3">{user.full_name}</td>
              <td className="py-3">
                {showArchiveDate
                  ? user.archived_at
                    ? formatDateShort(user.archived_at)
                    : '-'
                  : formatDateShort(user.updated_at)}
              </td>
              <td className="space-x-2 py-3 text-right">
                {showRestoreButton && onRestore && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onRestore(user.id, user.full_name || user.email)
                    }
                  >
                    <RotateCcw className="mr-1 h-4 w-4" />
                    Restore
                  </Button>
                )}
                {showReactivateButton && onReactivate && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onReactivate(user.id, user.full_name || user.email)
                    }
                  >
                    <RotateCcw className="mr-1 h-4 w-4" />
                    Reactivate
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
