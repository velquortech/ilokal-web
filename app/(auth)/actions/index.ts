// Re-export all auth actions for backward compatibility
export {
  loginAction,
  signupAction,
  redirectByRole,
  logoutAction,
  verifySessionAction,
} from './authActions';

export { updateCurrentUserProfileAction } from './userActions';
