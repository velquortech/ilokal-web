import { getPendingBranchesAction } from '../actions/branchActions';
import { AdminBranchesClient } from './components/admin-branches-client';
import { PageHeader } from '@/components/custom/PageHeader';

export const dynamic = 'force-dynamic';

export default async function AdminBranchesPage() {
  const result = await getPendingBranchesAction();

  const branches = result.success ? (result.data?.branches ?? []) : [];

  return (
    <div className="flex min-w-0 flex-1 flex-col space-y-6">
      <PageHeader
        title="Branch Applications"
        lede="Review and approve new branch location requests from business owners."
      />
      <AdminBranchesClient branches={branches} />
    </div>
  );
}
