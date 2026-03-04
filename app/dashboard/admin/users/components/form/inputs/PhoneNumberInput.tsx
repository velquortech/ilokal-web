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
import type {
  CountryCode,
  PhoneNumberInputProps,
} from '@/lib/types/phoneInput';
import {
  getUniqueCountryCodes,
  DEFAULT_COUNTRY_CODE,
} from '@/config/phoneConfig';

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
  /**
   * Value format: "ABBR+CODE|DIGITS" (e.g., "CA+1|1234567890")
   * This format persists the country selection even when codes are shared (US/CA both +1)
   */
  const parsePhoneValue = (val: string) => {
    const uniqueCountries = getUniqueCountryCodes();

    // Try to parse the new format: "ABBR+CODE|DIGITS"
    if (val.includes('|')) {
      const [countryPart, digits] = val.split('|');
      // Extract abbreviation from "ABBR+CODE" format
      const match = countryPart.match(/^([A-Z]{2})(.*)/);
      if (match) {
        const abbr = match[1];
        const code = match[2];
        const country = uniqueCountries.find(
          (c) => c.abbreviation === abbr && c.code === code,
        );
        if (country) {
          return {
            country,
            digits: digits || '',
          };
        }
      }
    }

    // Fallback: try to parse old format or plain code "+CODE DIGITS"
    const sorted = [...uniqueCountries].sort(
      (a, b) => b.code.length - a.code.length,
    );
    const country = sorted.find((c) => val.startsWith(c.code));

    if (country) {
      const digitsMatch = val.slice(country.code.length).trim();
      return {
        country,
        digits: digitsMatch,
      };
    }

    // Default to Philippines or first country
    const defaultCountry = DEFAULT_COUNTRY_CODE || uniqueCountries[0];
    return {
      country: defaultCountry,
      digits: val,
    };
  };

  const { country: currentCountry, digits: numberValue } = useMemo(
    () => parsePhoneValue(value),
    [value],
  );

  // Extract only digits from the number part
  const digitsOnly = useMemo(
    () => numberValue.replace(/\D/g, ''),
    [numberValue],
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
    const uniqueCountries = getUniqueCountryCodes();
    const newCountry = uniqueCountries.find(
      (c) => c.code === code && c.abbreviation === abbr,
    );

    if (newCountry) {
      // Format: "ABBR+CODE|DIGITS" (e.g., "CA+1|1234567890")
      const formatted = `${abbr}${code}|${digitsOnly}`;
      onChange(formatted);
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Keep only digits
    const newDigits = newValue.replace(/\D/g, '');
    // Limit to max length for current country
    const limitedDigits = newDigits.slice(0, currentCountry.maxLength);
    // Format: "ABBR+CODE|DIGITS" (e.g., "CA+1|1234567890")
    const formatted = `${currentCountry.abbreviation}${currentCountry.code}|${limitedDigits}`;
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
            {getUniqueCountryCodes().map((item) => (
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
