import assertAuthorized from '../assertAuthorized';
export { assertAuthorized };

export {
  PROTECTED_ROUTE_PREFIXES,
  isProtectedPath,
  roleAllowedForPath,
} from '../protectedRoutes';

export default {
  assertAuthorized,
};
