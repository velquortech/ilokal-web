'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export interface PhoneNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const COUNTRY_CODES = [
  { code: '+1', country: 'United States', emoji: '🇺🇸' },
  { code: '+1', country: 'Canada', emoji: '🇨🇦' },
  { code: '+44', country: 'United Kingdom', emoji: '🇬🇧' },
  { code: '+33', country: 'France', emoji: '🇫🇷' },
  { code: '+49', country: 'Germany', emoji: '🇩🇪' },
  { code: '+39', country: 'Italy', emoji: '🇮🇹' },
  { code: '+34', country: 'Spain', emoji: '🇪🇸' },
  { code: '+31', country: 'Netherlands', emoji: '🇳🇱' },
  { code: '+46', country: 'Sweden', emoji: '🇸🇪' },
  { code: '+47', country: 'Norway', emoji: '🇳🇴' },
  { code: '+45', country: 'Denmark', emoji: '🇩🇰' },
  { code: '+358', country: 'Finland', emoji: '🇫🇮' },
  { code: '+43', country: 'Austria', emoji: '🇦🇹' },
  { code: '+41', country: 'Switzerland', emoji: '🇨🇭' },
  { code: '+32', country: 'Belgium', emoji: '🇧🇪' },
  { code: '+48', country: 'Poland', emoji: '🇵🇱' },
  { code: '+420', country: 'Czech Republic', emoji: '🇨🇿' },
  { code: '+36', country: 'Hungary', emoji: '🇭🇺' },
  { code: '+40', country: 'Romania', emoji: '🇷🇴' },
  { code: '+90', country: 'Turkey', emoji: '🇹🇷' },
  { code: '+353', country: 'Ireland', emoji: '🇮🇪' },
  { code: '+30', country: 'Greece', emoji: '🇬🇷' },
  { code: '+385', country: 'Croatia', emoji: '🇭🇷' },
  { code: '+372', country: 'Estonia', emoji: '🇪🇪' },
  { code: '+371', country: 'Latvia', emoji: '🇱🇻' },
  { code: '+370', country: 'Lithuania', emoji: '🇱🇹' },
  { code: '+359', country: 'Bulgaria', emoji: '🇧🇬' },
  { code: '+386', country: 'Slovenia', emoji: '🇸🇮' },
  { code: '+389', country: 'Macedonia', emoji: '🇲🇰' },
  { code: '+387', country: 'Bosnia', emoji: '🇧🇦' },
  { code: '+381', country: 'Serbia', emoji: '🇷🇸' },
  { code: '+355', country: 'Albania', emoji: '🇦🇱' },
  { code: '+7', country: 'Russia', emoji: '🇷🇺' },
  { code: '+380', country: 'Ukraine', emoji: '🇺🇦' },
  { code: '+375', country: 'Belarus', emoji: '🇧🇾' },
  { code: '+60', country: 'Malaysia', emoji: '🇲🇾' },
  { code: '+65', country: 'Singapore', emoji: '🇸🇬' },
  { code: '+81', country: 'Japan', emoji: '🇯🇵' },
  { code: '+86', country: 'China', emoji: '🇨🇳' },
  { code: '+91', country: 'India', emoji: '🇮🇳' },
  { code: '+55', country: 'Brazil', emoji: '🇧🇷' },
  { code: '+27', country: 'South Africa', emoji: '🇿🇦' },
  { code: '+61', country: 'Australia', emoji: '🇦🇺' },
  { code: '+64', country: 'New Zealand', emoji: '🇳🇿' },
  { code: '+82', country: 'South Korea', emoji: '🇰🇷' },
  { code: '+66', country: 'Thailand', emoji: '🇹🇭' },
  { code: '+84', country: 'Vietnam', emoji: '🇻🇳' },
  { code: '+62', country: 'Indonesia', emoji: '🇮🇩' },
  { code: '+63', country: 'Philippines', emoji: '🇵🇭' },
  { code: '+92', country: 'Pakistan', emoji: '🇵🇰' },
  { code: '+20', country: 'Egypt', emoji: '🇪🇬' },
  { code: '+212', country: 'Morocco', emoji: '🇲🇦' },
  { code: '+234', country: 'Nigeria', emoji: '🇳🇬' },
  { code: '+56', country: 'Chile', emoji: '🇨🇱' },
  { code: '+57', country: 'Colombia', emoji: '🇨🇴' },
  { code: '+52', country: 'Mexico', emoji: '🇲🇽' },
];

const UNIQUE_COUNTRY_CODES = Array.from(
  new Map(
    COUNTRY_CODES.map((item) => [`${item.code}-${item.emoji}`, item]),
  ).values(),
);

/**
 * Normalize phone number to format: +63 9454757783
 * Only keep country code and digits
 */
const normalizePhoneNumber = (code: string, number: string): string => {
  // Remove all non-digit characters from the number part
  const digitsOnly = number.replace(/\D/g, '');
  return `${code} ${digitsOnly}`.trim();
};

export function PhoneNumberInput({
  value,
  onChange,
  placeholder = '(917) 000-0000',
  disabled = false,
}: PhoneNumberInputProps) {
  // Extract country code and number from value
  const getCountryCodeAndNumber = (val: string) => {
    // Find matching country code (sorted by length descending to handle +358 before +35)
    const sorted = [...UNIQUE_COUNTRY_CODES].sort(
      (a, b) => b.code.length - a.code.length,
    );
    const country = sorted.find((c) => val.startsWith(c.code));

    if (country) {
      return {
        code: country.code,
        emoji: country.emoji,
        number: val.slice(country.code.length).trim(),
      };
    }

    return {
      code: '+63',
      emoji: '🇵🇭',
      number: val,
    };
  };

  const {
    code: currentCode,
    emoji: currentEmoji,
    number: currentNumber,
  } = getCountryCodeAndNumber(value);

  const handleCodeChange = (selectValue: string) => {
    const [code] = selectValue.split('|');
    const normalized = normalizePhoneNumber(code, currentNumber);
    onChange(normalized);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value;
    const normalized = normalizePhoneNumber(currentCode, newNumber);
    onChange(normalized);
  };

  return (
    <div className="flex gap-2">
      <Select
        value={`${currentCode}|${currentEmoji}`}
        onValueChange={handleCodeChange}
      >
        <SelectTrigger className="flex-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {UNIQUE_COUNTRY_CODES.map((item) => (
            <SelectItem
              key={`${item.code}-${item.emoji}`}
              value={`${item.code}|${item.emoji}`}
            >
              <div className="flex items-center gap-1">
                <span className="text-lg">{item.emoji}</span>
                <span className="font-medium">{item.code}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="tel"
        placeholder={placeholder}
        value={currentNumber}
        onChange={handleNumberChange}
        disabled={disabled}
        className="flex-3"
      />
    </div>
  );
}
