import { Shield, Building2, Users, LucideIcon } from 'lucide-react';
import { AdminTab, ConsumersTab } from '../users/components';

export interface UserTab {
  id: string;
  label: string;
  icon: LucideIcon;
  component: React.ReactNode;
}

export const USER_MANAGEMENT_TABS: UserTab[] = [
  {
    id: 'admins',
    label: 'Admins',
    icon: Shield,
    component: <AdminTab />,
  },
  {
    id: 'business-owners',
    label: 'Business Owners',
    icon: Building2,
    component: null,
  },
  {
    id: 'consumers',
    label: 'Consumers',
    icon: Users,
    component: <ConsumersTab />,
  },
];
