export const pricingPlans = [
  {
    plan: 'Starter',
    price: 0,
    description: 'For individuals or small teams getting started.',
    features: [
      'Employee Scheduling',
      'Supplier & Order Management',
      'Absence & Leave Management',
      'Daily Attendance Log & Reports',
      'Notifications for Schedule Updates',
    ],
    isFeatured: false,
  },
  {
    plan: 'Pro',
    price: 999,
    description:
      'For growing teams that need advanced collaboration and insights.',
    features: [
      'Everything in Starter',
      'Advanced Permissions',
      'Priority Support',
      'Automated Workflows',
      'Project Templates',
      'Integrations (Slack, Google, Zapier)',
    ],
    isFeatured: true,
  },
  {
    plan: 'Business',
    price: 3000,
    description: 'For larger teams with compliance and scalability needs.',
    features: [
      'Everything in Pro',
      'Custom Roles & SSO',
      'Audit Logs',
      'Advanced Reporting',
      'Dedicated Success Manager',
      'Uptime SLA',
    ],
    isFeatured: false,
  },
];
