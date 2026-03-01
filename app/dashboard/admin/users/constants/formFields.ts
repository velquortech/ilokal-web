import { FormFieldConfig, SelectFieldConfig } from '@/lib/types/forms';

export const baseFormFields: FormFieldConfig[] = [
  {
    name: 'email',
    label: 'Email Address',
    placeholder: 'user@example.com',
    type: 'email',
    required: true,
  },
  {
    name: 'full_name',
    label: 'Full Name',
    placeholder: 'John Doe',
    type: 'text',
    required: true,
  },
  {
    name: 'password',
    label: 'Password',
    placeholder: 'Enter password',
    type: 'password',
    required: true,
  },
  {
    name: 'confirm_password',
    label: 'Confirm Password',
    placeholder: 'Confirm password',
    type: 'password',
    required: true,
  },
];

export const selectFields: Record<string, SelectFieldConfig> = {
  status: {
    name: 'status',
    label: 'Status',
    placeholder: 'Select status',
    showFor: ['admin', 'user'],
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'suspended', label: 'Suspended' },
    ],
  },
  verification_status: {
    name: 'verification_status',
    label: 'Verification Status',
    placeholder: 'Select status',
    showFor: ['business_owner'],
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'verified', label: 'Verified' },
      { value: 'suspended', label: 'Suspended' },
      { value: 'rejected', label: 'Rejected' },
    ],
  },
};
