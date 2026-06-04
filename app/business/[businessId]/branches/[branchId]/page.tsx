import { notFound } from 'next/navigation';
import { getBusinessBranchByIdAction } from '../../actions/branchActions';
import { BranchDetailContent } from './components/branch-detail-content';

type Params = Promise<{ businessId: string; branchId: string }>;

export default async function BranchDetailPage({ params }: { params: Params }) {
  const { businessId, branchId } = await params;

  const result = await getBusinessBranchByIdAction(branchId);

  if (!result.success || !result.data) {
    notFound();
  }

  return <BranchDetailContent branch={result.data} businessId={businessId} />;
}
