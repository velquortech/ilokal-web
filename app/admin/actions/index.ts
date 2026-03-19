/**
 * Admin Actions Barrel Export
 *
 * Re-exports all admin actions (user and business) for convenient imports.
 * Allows importing from @/app/admin/actions instead of specific files.
 */

// User actions
export {
  createAdminAction,
  updateAdminAction,
  deleteAdminAction,
  updateAdminStatusAction,
  createConsumerAction,
  updateConsumerAction,
  deleteConsumerAction,
  createBusinessOwnerAction,
  updateBusinessOwnerAction,
  deleteBusinessOwnerAction,
  type ActionState,
} from './userActions';

// Business actions
export {
  getBusinessesAction,
  getBusinessAction,
  getBusinessCountsAction,
  verifyBusinessAction,
  rejectBusinessAction,
  suspendBusinessAction,
  reactivateBusinessAction,
  updateBusinessAction,
  archiveBusinessAction,
  deleteBusinessAction,
} from './businessActions';
