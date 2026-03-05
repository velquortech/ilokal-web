import { FormFieldConfig } from '@/lib/types/forms';

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
    name: 'business_name',
    label: 'Business Name',
    placeholder: 'Your Business Name',
    type: 'text',
    showFor: ['business_owner'],
  },
  {
    name: 'phone_number',
    label: 'Phone Number (Optional)',
    placeholder: '(917) 000-0000',
    type: 'phone',
  },
  {
    name: 'avatar_url',
    label: 'Avatar (Optional)',
    placeholder: '',
    type: 'avatar',
    showFor: ['admin'],
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
