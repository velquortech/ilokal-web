/**
 * Phone number input types and country code configuration
 */

export type CountryCode = {
  code: string;
  country: string;
  abbreviation: string;
  emoji: string;
  pattern: RegExp;
  format: string;
  minLength: number;
  maxLength: number;
};

export type PhoneNumberInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};
