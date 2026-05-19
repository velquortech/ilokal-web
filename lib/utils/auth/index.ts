import assertAuthorized from '../assertAuthorized';
export { assertAuthorized };

export {
  PROTECTED_ROUTE_PREFIXES,
  API_PROTECTED_PREFIXES,
  isProtectedPath,
  roleAllowedForPath,
} from '../protectedRoutes';

export default {
  assertAuthorized,
};
