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
  NotificationPreferences,
  CreateNotificationRequest,
  PaginatedNotificationsResponse,
} from './notification';

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

// Test helpers (used by unit/integration tests)
export type { TestNextRequest } from './test';
