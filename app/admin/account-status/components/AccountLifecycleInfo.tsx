import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Archive, Clock } from 'lucide-react';

export function AccountLifecycleInfo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Lifecycle</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <h4 className="flex items-center gap-2 font-medium">
            <Archive className="h-4 w-4" /> Archived Accounts
          </h4>
          <p className="text-muted-foreground ml-6">
            Users deleted from the system. Data is preserved in the database but
            the user cannot login. Can be restored to active status at any time.
          </p>
        </div>
        <div>
          <h4 className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4" /> Suspended Accounts
          </h4>
          <p className="text-muted-foreground ml-6">
            Users suspended by admin action due to violations or security
            concerns. Can be reactivated once the issue is resolved.
          </p>
        </div>
        <div>
          <h4 className="flex items-center gap-2 font-medium">
            <Clock className="h-4 w-4" /> Inactive Accounts
          </h4>
          <p className="text-muted-foreground ml-6">
            Users who are marked as inactive but still have account data. Can be
            reactivated to allow login again.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
