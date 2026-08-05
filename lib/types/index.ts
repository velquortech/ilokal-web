/**
 * Centralized Type Export Index
 *
 * Single source of truth for all type imports throughout the codebase
 * Instead of scattered imports, use:
 *
 * ✅ CORRECT:
 * import type { User, AdminCreateUserInput, ApiResponse } from '@/lib/types';
 *
 * ❌ WRONG:
 * import type { User } from '@/lib/types/user';
 * import type { ApiResponse } from '@/lib/types/common';
 */

// Common/Global Types
export type {
  ApiResponse,
  ApiError,
  ApiErrorCode,
  PaginatedResult,
  PaginatedApiResponse,
  ExtractData,
} from './common';

// User Domain Types
export type {
  UserRole,
  Profile,
  User,
  AuthUser,
  DatabaseProfile,
  DatabaseInsertProfile,
  DatabaseUpdateProfile,
} from './user';

// Business Domain Types
export type {
  Business,
  AdminBusiness,
  BusinessFilters,
  PaginatedBusinessResponse,
  CreateBusinessInput,
  UpdateBusinessInput,
  BusinessVerificationStatus,
  BusinessProfileData,
} from './business';

// Product Domain Types
export type {
  Product,
  Category,
  ProductStatus,
  PriceType,
  ProductSortOrder,
  CreateProductRequest,
  UpdateProductRequest,
  ApplySaleRequest,
  ProductResponse,
  PaginatedProductsResponse,
  ProductStats,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  ProductFilters,
  CategoryFilters,
  ProductError,
} from './product';
export { PRODUCT_STATUSES, PRODUCT_STATUS_OPTIONS } from './product';

// Event Domain Types
export type {
  Event,
  EventStatus,
  EventBusinessRef,
  EventProductRef,
  EventWithRefs,
  NearbyEvent,
  EventListMetadata,
  PaginatedEvents,
  EventTimeFilter,
  EventFilters,
  EventDecision,
  EventStats,
} from './event';
export {
  EVENT_STATUSES,
  EVENT_STATUS_OPTIONS,
  EVENT_TIME_FILTERS,
  EMPTY_EVENT_STATS,
} from './event';

// Offering Domain Types (product/service discriminators)
export type { OfferingKind, OfferingMode } from './offering';
export {
  OFFERING_KINDS,
  OFFERING_MODES,
  modeAllowsProducts,
  modeAllowsServices,
  defaultKindForMode,
} from './offering';

// Branch Domain Types
export type {
  Branch,
  BranchResponse,
  BranchStats,
  BranchStatus,
  BranchDocument,
  CreateBranchRequest,
  UpdateBranchRequest,
  BranchFilters,
  PaginatedBranchesResponse,
  BranchError,
} from './branch';

// Coupon & Deal Domain Types
export type {
  Coupon,
  FeaturedDeal,
  DiscountValue,
  DiscountType,
  PromotionType,
  CouponStatus,
  UsageScope,
  CreateCouponRequest,
  UpdateCouponRequest,
  CouponFilters,
  PaginatedCouponsResponse,
  CouponDetailResponse,
  CouponRedemption,
  RedemptionStats,
  RedemptionStatus,
  RedemptionRecord,
  RedemptionRecordFilters,
  PaginatedRedemptionRecordsResponse,
  RedemptionSummaryStats,
  CreateFeaturedDealRequest,
  UpdateFeaturedDealRequest,
  FeaturedDealFilters,
  PaginatedFeaturedDealsResponse,
  FeaturedDealDuration,
  CouponError,
} from './coupon';

// Payment & Invoice Domain Types
export type {
  Payment,
  PaymentResponse,
  PaymentStatus,
  PaymentMethod,
  CreatePaymentRequest,
  PaymentHistoryFilters,
  PaginatedPaymentsResponse,
  Invoice,
  InvoiceResponse,
  InvoiceStatus,
  CreateInvoiceRequest,
  InvoiceFilters,
  PaginatedInvoicesResponse,
  CheckoutRequest,
  StripeCheckoutSession,
  StripePaymentConfirm,
  PaymentAnalytics,
  PaymentError,
} from './payment';

// Subscription Domain Types
export type {
  BillingCycle,
  SubscriptionStatus,
  PlanTier,
  FeatureType,
  PaymentMethodType,
  SubscriptionPlan,
  SubscriptionPlanFeature,
  Subscription,
  PaymentMethod as SubscriptionPaymentMethod,
  SubscriptionUsage,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  UpgradeSubscriptionRequest,
  DowngradeSubscriptionRequest,
  CancelSubscriptionRequest,
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest,
  SubscriptionResponse,
  SubscriptionWithUsageResponse,
  SubscriptionPlanListResponse,
  PaymentMethodListResponse,
  BillingInvoice,
  BillingInvoiceResponse,
  BillingUsageResponse,
  PaginatedSubscriptionResponse,
  PaginatedInvoiceResponse,
  PaginatedPaymentMethodResponse,
} from './subscription';

// Search & Discovery Domain Types
export type {
  SearchType,
  SortBy,
  BusinessSearchResult,
  ProductSearchResult,
  DealSearchResult,
  TrendingResult,
  PaginationParams,
  SearchFilters,
  SearchRequest,
  SearchResponse,
  GlobalSearchResponse,
  TrendingResponse,
  GlobalSearchRequest,
  BusinessSearchRequest,
  ProductSearchRequest,
  DealSearchRequest,
  AdvancedFilterRequest,
} from './search';

// Admin Domain Types
export type {
  AdminUser,
  AdminActionResponse,
  AdminDashboardStats,
  AdminCapabilities,
  AdminContextState,
  AdminUpdateUserInput,
  AdminUserFilters,
  AdminActivityLog,
} from './admin';

// Moderation types
export type {
  ModerationReport,
  FlaggedContent,
  ModerationActionRequest,
  SuspendRequest,
  WarnRequest,
} from './moderation';

// Notification types
export type {
  Notification,
  NotificationType,
  NotificationMetadata,
  NotificationPreferences,
  CreateNotificationRequest,
  EmitNotificationInput,
  NotificationListParams,
  NotificationPage,
  PaginatedNotificationsResponse,
} from './notification';
export { NOTIFICATION_TYPES } from './notification';

// Review types
export type {
  Review,
  CreateReviewRequest,
  UpdateReviewRequest,
  PaginatedReviewsResponse,
  RatingResponse,
} from './review';

// Rating types
export type {
  Rating,
  CreateRatingRequest,
  UpdateRatingRequest,
  RatingStats,
} from './rating';

// Analytics Types
export type { PlatformAnalytics, AdminAnalyticsResponse } from './analytics';
export type {
  BusinessDashboard,
  ProductPerformance,
  CouponStats,
  TrafficMetrics,
  BusinessRevenue,
  RetentionMonth,
  MonthlyTrendPoint,
  FollowerFunnelData,
  CouponPerformanceItem,
  CustomerSegmentCounts,
  BusinessHealthData,
  AutomationSuggestion,
  BusinessAnalyticsDashboard,
} from './analyticsBusiness';

// Form Types
export type { SelectFieldConfig, UserFormModalProps } from './forms';

// Proxy Types
// Note: proxy.ts types may be imported as needed

// Phone Input Types
export type { CountryCode } from './phoneInput';

// Settings Domain Types
export type {
  OperatingHoursDay,
  DayKey,
  OperatingHours,
  SocialLinks,
  BusinessSettings,
  MFAFactor,
} from './settings';

// Database Types
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from './database';

// Customer portal (public explore + protected customer area)
export type {
  DirectoryBusiness,
  DirectoryMetadata,
  CustomerCategory,
  PublicBranch,
  PublicProduct,
  PublicCoupon,
  PublicBusinessInfo,
  PublicBusinessProfile,
  WalletRedemption,
  WalletFilter,
  FollowedBusiness,
} from './customer';

// Shop sections (owner-editable grouping; distinct from platform categories)
export type {
  ProductSection,
  ProductSectionWithCount,
  CreateSectionRequest,
  UpdateSectionRequest,
} from './section';
export { MAX_SECTIONS_PER_SHOP, MAX_SECTION_NAME_LENGTH } from './section';

// Post-registration setup checklist (derived, never stored)
export type {
  OnboardingItemId,
  OnboardingItem,
  OnboardingProgress,
  OnboardingState,
} from './onboarding';
export {
  EMPTY_ONBOARDING_PROGRESS,
  EMPTY_ONBOARDING_STATE,
} from './onboarding';

// Test helpers (used by unit/integration tests)
export type { TestNextRequest } from './test';
