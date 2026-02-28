import { UserRole } from '@/lib/types/user';

export const getRoleFromUserType = (userType: string): UserRole => {
  const roleMap: Record<string, UserRole> = {
    admin: 'admin',
    business_owner: 'business_owner',
    user: 'user',
  };
  return roleMap[userType] || 'user';
};
