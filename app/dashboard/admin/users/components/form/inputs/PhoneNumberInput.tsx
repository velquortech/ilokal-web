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
  // Extract country code and number from value
  const getCountryCodeAndNumber = (val: string) => {
    const uniqueCountries = getUniqueCountryCodes();
    // Find matching country code (sorted by length descending to handle +358 before +35)
    const sorted = [...uniqueCountries].sort(
      (a, b) => b.code.length - a.code.length,
    );
    const country = sorted.find((c) => val.startsWith(c.code));

    if (country) {
      return {
        ...country,
        number: val.slice(country.code.length).trim(),
      };
    }

    // Default to Philippines or first country
    const defaultCountry = DEFAULT_COUNTRY_CODE || uniqueCountries[0];

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
    const uniqueCountries = getUniqueCountryCodes();
    const newCountry = uniqueCountries.find(
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
