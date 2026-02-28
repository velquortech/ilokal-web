import { UserRole } from '@/lib/types/user';

export const getRoleFromUserType = (userType: string): UserRole => {
  const roleMap: Record<string, UserRole> = {
    admin: 'admin',
    business_owner: 'business_owner',
    consumer: 'consumer',
  };
  return roleMap[userType] || 'consumer';
};
