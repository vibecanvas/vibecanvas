import js from '@eslint/js';
import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  {
    ignores: [
      'coverage/**',
      'es/**',
      'lib/**',
      'dist/**',
      'node_modules/**',
      'examples/**',
      'rust/**',
      '__tests__/**',
    ],
  },

  js.configs.recommended,

  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        window: 'readonly',
        document: 'readonly',
        module: 'readonly',
      },
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslintPlugin,
    },
    rules: {
      '@typescript-eslint/adjacent-overload-signatures': 'error',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-array-constructor': 'error',
      '@typescript-eslint/no-duplicate-enum-values': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-extra-non-null-assertion': 'error',
      '@typescript-eslint/no-misused-new': 'error',
      '@typescript-eslint/no-namespace': 'error',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
      '@typescript-eslint/no-this-alias': 'error',
      '@typescript-eslint/no-unnecessary-type-constraint': 'error',
      '@typescript-eslint/no-unsafe-declaration-merging': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'none',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/triple-slash-reference': 'error',
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-shadow-restricted-names': 'off',
      'no-fallthrough': 'off',
      'no-empty': 'off',
      'no-param-reassign': 'off',
      'no-redeclare': 'off',
      'no-useless-escape': 'off',
      'no-case-declarations': 'off',
      'no-constant-condition': 'off',
      '@typescript-eslint/no-restricted-types': 'error',
      '@typescript-eslint/no-shadow': 'off',
      '@typescript-eslint/no-parameter-properties': 'off',
      '@typescript-eslint/no-invalid-this': 'off',
      '@typescript-eslint/no-use-before-define': [
        'error',
        { functions: false, classes: false },
      ],
      '@typescript-eslint/no-redeclare': ['error'],
    },
  },
];
