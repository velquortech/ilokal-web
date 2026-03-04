'use client';

import React, { useMemo } from 'react';
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

interface CountryCode {
  code: string;
  country: string;
  abbreviation: string;
  emoji: string;
  pattern: RegExp;
  format: string;
  minLength: number;
  maxLength: number;
}

const COUNTRY_CODES: CountryCode[] = [
  {
    code: '+1',
    country: 'United States',
    abbreviation: 'US',
    emoji: '🇺🇸',
    pattern: /^[2-9]\d{2}[2-9]\d{6}$/,
    format: '(XXX) XXX-XXXX',
    minLength: 10,
    maxLength: 10,
  },
  {
    code: '+1',
    country: 'Canada',
    abbreviation: 'CA',
    emoji: '🇨🇦',
    pattern: /^[2-9]\d{2}[2-9]\d{6}$/,
    format: '(XXX) XXX-XXXX',
    minLength: 10,
    maxLength: 10,
  },
  {
    code: '+44',
    country: 'United Kingdom',
    abbreviation: 'GB',
    emoji: '🇬🇧',
    pattern: /^\d{10}$/,
    format: 'XXXX XXX XXXX',
    minLength: 10,
    maxLength: 10,
  },
  {
    code: '+33',
    country: 'France',
    abbreviation: 'FR',
    emoji: '🇫🇷',
    pattern: /^[1-9]\d{8}$/,
    format: 'X XX XX XX XX',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: '+49',
    country: 'Germany',
    abbreviation: 'DE',
    emoji: '🇩🇪',
    pattern: /^[1-9]\d{8,10}$/,
    format: 'XXX XXXXXXXX',
    minLength: 9,
    maxLength: 11,
  },
  {
    code: '+39',
    country: 'Italy',
    abbreviation: 'IT',
    emoji: '🇮🇹',
    pattern: /^[0-9]{9,10}$/,
    format: 'XXX XXX XXXX',
    minLength: 9,
    maxLength: 10,
  },
  {
    code: '+34',
    country: 'Spain',
    abbreviation: 'ES',
    emoji: '🇪🇸',
    pattern: /^[0-9]{9}$/,
    format: 'XXX XX XX XX',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: '+31',
    country: 'Netherlands',
    abbreviation: 'NL',
    emoji: '🇳🇱',
    pattern: /^[1-9]\d{8}$/,
    format: 'XX XXXX XXXX',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: '+46',
    country: 'Sweden',
    abbreviation: 'SE',
    emoji: '🇸🇪',
    pattern: /^[0-9]{7,9}$/,
    format: 'XXX XXX XXXX',
    minLength: 7,
    maxLength: 9,
  },
  {
    code: '+47',
    country: 'Norway',
    abbreviation: 'NO',
    emoji: '🇳🇴',
    pattern: /^[0-9]{8}$/,
    format: 'XXXX XXXX',
    minLength: 8,
    maxLength: 8,
  },
  {
    code: '+45',
    country: 'Denmark',
    abbreviation: 'DK',
    emoji: '🇩🇰',
    pattern: /^[0-9]{8}$/,
    format: 'XXXX XXXX',
    minLength: 8,
    maxLength: 8,
  },
  {
    code: '+358',
    country: 'Finland',
    abbreviation: 'FI',
    emoji: '🇫🇮',
    pattern: /^[0-9]{9}$/,
    format: 'XXX XXX XXXX',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: '+43',
    country: 'Austria',
    abbreviation: 'AT',
    emoji: '🇦🇹',
    pattern: /^[1-9]\d{8,9}$/,
    format: 'XXX XXXXXXXX',
    minLength: 9,
    maxLength: 10,
  },
  {
    code: '+41',
    country: 'Switzerland',
    abbreviation: 'CH',
    emoji: '🇨🇭',
    pattern: /^[1-9]\d{8}$/,
    format: 'XX XXX XXXX',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: '+32',
    country: 'Belgium',
    abbreviation: 'BE',
    emoji: '🇧🇪',
    pattern: /^[0-9]{8,9}$/,
    format: 'XXX XX XX XX',
    minLength: 8,
    maxLength: 9,
  },
  {
    code: '+48',
    country: 'Poland',
    abbreviation: 'PL',
    emoji: '🇵🇱',
    pattern: /^[0-9]{9}$/,
    format: 'XXX XXX XXXX',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: '+420',
    country: 'Czech Republic',
    abbreviation: 'CZ',
    emoji: '🇨🇿',
    pattern: /^[0-9]{9}$/,
    format: 'XXX XXX XXXX',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: '+36',
    country: 'Hungary',
    abbreviation: 'HU',
    emoji: '🇭🇺',
    pattern: /^[0-9]{9}$/,
    format: 'XXX XXX XXXX',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: '+40',
    country: 'Romania',
    abbreviation: 'RO',
    emoji: '🇷🇴',
    pattern: /^[0-9]{9}$/,
    format: 'XXX XXX XXXX',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: '+90',
    country: 'Turkey',
    abbreviation: 'TR',
    emoji: '🇹🇷',
    pattern: /^[0-9]{10}$/,
    format: 'XXX XXX XXXX',
    minLength: 10,
    maxLength: 10,
  },
  {
    code: '+353',
    country: 'Ireland',
    abbreviation: 'IE',
    emoji: '🇮🇪',
    pattern: /^[0-9]{9}$/,
    format: 'XXX XXX XXXX',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: '+30',
    country: 'Greece',
    abbreviation: 'GR',
    emoji: '🇬🇷',
    pattern: /^[0-9]{9}$/,
    format: 'XXXX XXX XXXX',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: '+385',
    country: 'Croatia',
    abbreviation: 'HR',
    emoji: '🇭🇷',
    pattern: /^[0-9]{8,9}$/,
    format: 'XXX XXX XXXX',
    minLength: 8,
    maxLength: 9,
  },
  {
    code: '+372',
    country: 'Estonia',
    abbreviation: 'EE',
    emoji: '🇪🇪',
    pattern: /^[0-9]{7,8}$/,
    format: 'XXX XXXX',
    minLength: 7,
    maxLength: 8,
  },
  {
    code: '+371',
    country: 'Latvia',
    abbreviation: 'LV',
    emoji: '🇱🇻',
    pattern: /^[0-9]{8}$/,
    format: 'XXXX XXXX',
    minLength: 8,
    maxLength: 8,
  },
  {
    code: '+370',
    country: 'Lithuania',
    abbreviation: 'LT',
    emoji: '🇱🇹',
    pattern: /^[0-9]{8}$/,
    format: 'XXXX XXXX',
    minLength: 8,
    maxLength: 8,
  },
  {
    code: '+359',
    country: 'Bulgaria',
    abbreviation: 'BG',
    emoji: '🇧🇬',
    pattern: /^[0-9]{8,9}$/,
    format: 'XXX XXX XXX',
    minLength: 8,
    maxLength: 9,
  },
  {
    code: '+386',
    country: 'Slovenia',
    abbreviation: 'SI',
    emoji: '🇸🇮',
    pattern: /^[0-9]{8}$/,
    format: 'XXXX XXXX',
    minLength: 8,
    maxLength: 8,
  },
  {
    code: '+389',
    country: 'Macedonia',
    abbreviation: 'MK',
    emoji: '🇲🇰',
    pattern: /^[0-9]{8}$/,
    format: 'XXXX XXXX',
    minLength: 8,
    maxLength: 8,
  },
  {
    code: '+387',
    country: 'Bosnia',
    abbreviation: 'BA',
    emoji: '🇧🇦',
    pattern: /^[0-9]{8}$/,
    format: 'XXXX XXXX',
    minLength: 8,
    maxLength: 8,
  },
  {
    code: '+381',
    country: 'Serbia',
    abbreviation: 'RS',
    emoji: '🇷🇸',
    pattern: /^[0-9]{8,9}$/,
    format: 'XXX XXXX XXX',
    minLength: 8,
    maxLength: 9,
  },
  {
    code: '+355',
    country: 'Albania',
    abbreviation: 'AL',
    emoji: '🇦🇱',
    pattern: /^[0-9]{8}$/,
    format: 'XXXX XXXX',
    minLength: 8,
    maxLength: 8,
  },
  {
    code: '+7',
    country: 'Russia',
    abbreviation: 'RU',
    emoji: '🇷🇺',
    pattern: /^[0-9]{10}$/,
    format: 'XXX XXX XX XX',
    minLength: 10,
    maxLength: 10,
  },
  {
    code: '+380',
    country: 'Ukraine',
    abbreviation: 'UA',
    emoji: '🇺🇦',
    pattern: /^[0-9]{9}$/,
    format: 'XXX XXX XXXX',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: '+375',
    country: 'Belarus',
    abbreviation: 'BY',
    emoji: '🇧🇾',
    pattern: /^[0-9]{9}$/,
    format: 'XXX XXX XXXX',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: '+60',
    country: 'Malaysia',
    abbreviation: 'MY',
    emoji: '🇲🇾',
    pattern: /^[0-9]{9,10}$/,
    format: 'XXX XXXX XXXX',
    minLength: 9,
    maxLength: 10,
  },
  {
    code: '+65',
    country: 'Singapore',
    abbreviation: 'SG',
    emoji: '🇸🇬',
    pattern: /^[0-9]{8}$/,
    format: 'XXXX XXXX',
    minLength: 8,
    maxLength: 8,
  },
  {
    code: '+81',
    country: 'Japan',
    abbreviation: 'JP',
    emoji: '🇯🇵',
    pattern: /^[0-9]{10}$/,
    format: 'XXX XXXX XXXX',
    minLength: 10,
    maxLength: 10,
  },
  {
    code: '+86',
    country: 'China',
    abbreviation: 'CN',
    emoji: '🇨🇳',
    pattern: /^[0-9]{11}$/,
    format: 'XXXX XXX XXXX',
    minLength: 11,
    maxLength: 11,
  },
  {
    code: '+91',
    country: 'India',
    abbreviation: 'IN',
    emoji: '🇮🇳',
    pattern: /^[6-9]\d{9}$/,
    format: 'XXXXX XXXXX',
    minLength: 10,
    maxLength: 10,
  },
  {
    code: '+55',
    country: 'Brazil',
    abbreviation: 'BR',
    emoji: '🇧🇷',
    pattern: /^[0-9]{10,11}$/,
    format: 'XX XXXXX XXXX',
    minLength: 10,
    maxLength: 11,
  },
  {
    code: '+27',
    country: 'South Africa',
    abbreviation: 'ZA',
    emoji: '🇿🇦',
    pattern: /^[0-9]{9}$/,
    format: 'XXX XXX XXXX',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: '+61',
    country: 'Australia',
    abbreviation: 'AU',
    emoji: '🇦🇺',
    pattern: /^[0-9]{9}$/,
    format: 'XXXX XXX XXX',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: '+64',
    country: 'New Zealand',
    abbreviation: 'NZ',
    emoji: '🇳🇿',
    pattern: /^[0-9]{8,9}$/,
    format: 'XXXX XXXX',
    minLength: 8,
    maxLength: 9,
  },
  {
    code: '+82',
    country: 'South Korea',
    abbreviation: 'KR',
    emoji: '🇰🇷',
    pattern: /^[0-9]{9,10}$/,
    format: 'XXXX XXXX',
    minLength: 9,
    maxLength: 10,
  },
  {
    code: '+66',
    country: 'Thailand',
    abbreviation: 'TH',
    emoji: '🇹🇭',
    pattern: /^[0-9]{9}$/,
    format: 'XXXX XXXXX',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: '+84',
    country: 'Vietnam',
    abbreviation: 'VN',
    emoji: '🇻🇳',
    pattern: /^[0-9]{9,10}$/,
    format: 'XXXX XXXXXX',
    minLength: 9,
    maxLength: 10,
  },
  {
    code: '+62',
    country: 'Indonesia',
    abbreviation: 'ID',
    emoji: '🇮🇩',
    pattern: /^[0-9]{9,11}$/,
    format: 'XXXX XXXX XXXX',
    minLength: 9,
    maxLength: 11,
  },
  {
    code: '+63',
    country: 'Philippines',
    abbreviation: 'PH',
    emoji: '🇵🇭',
    pattern: /^[0-9]{10}$/,
    format: 'XXX XXX XXXX',
    minLength: 10,
    maxLength: 10,
  },
  {
    code: '+92',
    country: 'Pakistan',
    abbreviation: 'PK',
    emoji: '🇵🇰',
    pattern: /^[0-9]{10}$/,
    format: 'XXXX XXXXXX',
    minLength: 10,
    maxLength: 10,
  },
  {
    code: '+20',
    country: 'Egypt',
    abbreviation: 'EG',
    emoji: '🇪🇬',
    pattern: /^[0-9]{9,10}$/,
    format: 'XXXX XXXXXX',
    minLength: 9,
    maxLength: 10,
  },
  {
    code: '+212',
    country: 'Morocco',
    abbreviation: 'MA',
    emoji: '🇲🇦',
    pattern: /^[0-9]{9}$/,
    format: 'XXX XXX XXXX',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: '+234',
    country: 'Nigeria',
    abbreviation: 'NG',
    emoji: '🇳🇬',
    pattern: /^[0-9]{10}$/,
    format: 'XXXX XXXXXX',
    minLength: 10,
    maxLength: 10,
  },
  {
    code: '+56',
    country: 'Chile',
    abbreviation: 'CL',
    emoji: '🇨🇱',
    pattern: /^[0-9]{8,9}$/,
    format: 'XXXX XXXX',
    minLength: 8,
    maxLength: 9,
  },
  {
    code: '+57',
    country: 'Colombia',
    abbreviation: 'CO',
    emoji: '🇨🇴',
    pattern: /^[0-9]{10}$/,
    format: 'XXXX XXXXXX',
    minLength: 10,
    maxLength: 10,
  },
  {
    code: '+52',
    country: 'Mexico',
    abbreviation: 'MX',
    emoji: '🇲🇽',
    pattern: /^[0-9]{10}$/,
    format: 'XXXXX XXXXX',
    minLength: 10,
    maxLength: 10,
  },
];

const UNIQUE_COUNTRY_CODES = Array.from(
  new Map(
    COUNTRY_CODES.map((item) => [`${item.code}-${item.abbreviation}`, item]),
  ).values(),
);

/**
 * Format phone number according to country pattern
 * Replaces X with digits in the format string
 */
const formatPhoneNumber = (format: string, digits: string): string => {
  let result = '';
  let digitIndex = 0;

  for (let i = 0; i < format.length && digitIndex < digits.length; i++) {
    if (format[i] === 'X') {
      result += digits[digitIndex];
      digitIndex++;
    } else {
      result += format[i];
    }
  }

  return result;
};

/**
 * Validate phone number against country pattern
 */
const validatePhoneNumber = (
  countryCode: CountryCode,
  digits: string,
): boolean =>
  digits.length >= countryCode.minLength &&
  digits.length <= countryCode.maxLength &&
  countryCode.pattern.test(digits);

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
        ...country,
        number: val.slice(country.code.length).trim(),
      };
    }

    // Default to Philippines
    const defaultCountry =
      UNIQUE_COUNTRY_CODES.find(
        (c) => c.code === '+63' && c.abbreviation === 'PH',
      ) || UNIQUE_COUNTRY_CODES[0];

    return {
      ...defaultCountry,
      number: val,
    };
  };

  const currentCountry = useMemo(() => getCountryCodeAndNumber(value), [value]);

  // Extract only digits from the number part
  const digitsOnly = useMemo(
    () => currentCountry.number.replace(/\D/g, ''),
    [currentCountry.number],
  );

  // Check if phone number is valid
  const isValid = useMemo(
    () =>
      digitsOnly.length === 0 ||
      validatePhoneNumber(currentCountry, digitsOnly),
    [digitsOnly, currentCountry],
  );

  // Format the display value
  const displayValue = useMemo(() => {
    if (digitsOnly.length === 0) return '';
    return formatPhoneNumber(currentCountry.format, digitsOnly);
  }, [digitsOnly, currentCountry.format]);

  const handleCodeChange = (selectValue: string) => {
    const [code, abbr] = selectValue.split('|');
    const newCountry = UNIQUE_COUNTRY_CODES.find(
      (c) => c.code === code && c.abbreviation === abbr,
    );

    if (newCountry) {
      // Keep digits, update to new country code
      const formatted = `${code} ${digitsOnly}`.trim();
      onChange(formatted);
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Keep only digits
    const newDigits = newValue.replace(/\D/g, '');
    // Limit to max length for current country
    const limitedDigits = newDigits.slice(0, currentCountry.maxLength);
    const formatted = `${currentCountry.code} ${limitedDigits}`.trim();
    onChange(formatted);
  };

  const selectValue = `${currentCountry.code}|${currentCountry.abbreviation}`;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select value={selectValue} onValueChange={handleCodeChange}>
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNIQUE_COUNTRY_CODES.map((item) => (
              <SelectItem
                key={`${item.code}-${item.abbreviation}`}
                value={`${item.code}|${item.abbreviation}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{item.emoji}</span>
                  <span className="font-medium">{item.abbreviation}</span>
                  <span className="text-xs text-gray-500">{item.code}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="tel"
          placeholder={placeholder}
          value={displayValue}
          onChange={handleNumberChange}
          disabled={disabled}
          className={`flex-3 ${
            digitsOnly.length > 0 && !isValid
              ? 'border-red-500 focus-visible:ring-red-500'
              : ''
          }`}
        />
      </div>

      {digitsOnly.length > 0 && !isValid && (
        <p className="text-xs text-red-600">
          Invalid format. Expected: {currentCountry.format.replace(/X/g, '0')}
        </p>
      )}

      {digitsOnly.length > 0 && isValid && (
        <p className="text-xs text-green-600">✓ Valid phone number</p>
      )}
    </div>
  );
}
