export { default as userService } from './userService';
export { default as http } from './client';

// Re-export commonly used types from the legacy browser services so callers
// can migrate imports to `@/services` incrementally.
export type { PaginatedResponse } from '../../services/api/paginationService';
export type {
  CreateUserInput,
  UpdateUserInput,
  AdminUpdateUserInput,
} from '../../services/api/userService';
export {
  getOffset,
  getTotalPages,
  createPaginatedResponse,
} from '../../services/api/paginationService';
