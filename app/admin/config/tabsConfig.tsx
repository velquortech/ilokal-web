import { Shield, Building2, Users, LucideIcon } from 'lucide-react';

export interface UserTab {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const USER_MANAGEMENT_TABS: UserTab[] = [
  {
    id: 'admins',
    label: 'Admins',
    icon: Shield,
  },
  {
    id: 'business-owners',
    label: 'Business Owners',
    icon: Building2,
  },
  {
    id: 'consumers',
    label: 'Consumers',
    icon: Users,
  },
];
