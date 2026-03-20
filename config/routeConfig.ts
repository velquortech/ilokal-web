// config/routes.ts
export const ROUTES = {
  AUTH: {
    LOGIN: '/login',
    SIGNUP: '/signup',
  },
  DASHBOARD: {
    HOME: '/home',
    ADMIN: '/admin',
    BUSINESS: '/business',
  },
  REDIRECT_BY_ROLE: {
    admin: '/admin',
    business_owner: '/business',
    user: '/home',
  },
  BUSINESS: {
    home: '/business',
    registration: '/business-registration',
  },
} as const;

// For middleware matcher
export const PROTECTED_ROUTES = {
  ADMIN: '/admin',
  BUSINESS: '/business',
};
