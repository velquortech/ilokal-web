import { UserRole } from '@/lib/types/user';

export const getRoleFromUserType = (userType: string): UserRole => {
  const roleMap: Record<string, UserRole> = {
    admin: 'admin',
    business_owner: 'business_owner',
    app_user: 'app_user',
    user: 'app_user', // Legacy support
  };
  return roleMap[userType] || 'app_user';
};
