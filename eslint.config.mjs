import pluginPrettier from 'eslint-plugin-prettier';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier/flat';
import reactPlugin from 'eslint-plugin-react';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';

import nextPlugin from '@next/eslint-plugin-next';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'dist/**',
      'next.**',
      'next-**',
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    plugins: {
      '@next/next': nextPlugin,
      prettier: pluginPrettier,
      react: reactPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },

  prettier,

  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      'prettier/prettier': 'error',

      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/prefer-stateless-function': 'error',
      'react/jsx-props-no-spreading': 'off',
      'react/require-default-props': 'off',
      'react/no-unused-prop-types': 'off',

      'no-console': ['error', { allow: ['error', 'info', 'warn'] }],

      'no-prototype-builtins': 'off',
      'import/prefer-default-export': 'off',

      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/aria-proptypes': 'warn',
      'jsx-a11y/aria-unsupported-elements': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'warn',
      'jsx-a11y/role-supports-aria-props': 'warn',

      'jsx-a11y/label-has-associated-control': [
        'error',
        { required: { some: ['nesting', 'id'] } },
      ],

      'arrow-body-style': ['error', 'as-needed'],

      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: ['variable'],
          format: ['camelCase', 'snake_case', 'UPPER_CASE', 'PascalCase'],
        },
      ],

      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],

      // Disabled ones you had
      'jsx-a11y/control-has-associated-label': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/no-null': 'off',
      'unicorn/expiring-todo-comments': 'off',
      'unicorn/switch-case-braces': 'off',
      'unicorn/no-document-cookie': 'off',
      'import/no-cycle': 'off',
      'promise/always-return': 'off',
      'promise/catch-or-return': 'off',
      radix: 'off',
    },
  },

  {
    files: ['components/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'arrow-body-style': 'off',
      '@typescript-eslint/naming-convention': 'off',
    },
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
  },

  {
    files: [
      '*.test.{ts,tsx}',
      'constants.{ts,tsx}',
      'helpers.{ts,tsx}',
      '**/constants/*.{ts,tsx}',
      '**/helpers/*.{ts,tsx}',
      '**/helpers/**',
    ],
    rules: {
      'unicorn/filename-case': 'off',
    },
  },
);
