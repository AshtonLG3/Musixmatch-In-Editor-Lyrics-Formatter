import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';

export default defineConfig([
  globalIgnores(['node_modules/**']),
  {
    files: ['**/*.js'],
    plugins: {
      js,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        chrome: 'readonly',
        browser: 'readonly',
        runFormat: 'readonly',
      },
    },
    extends: ['js/recommended'],
    rules: {
      'array-callback-return': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unassigned-vars': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-useless-escape': 'warn',
      'no-misleading-character-class': 'warn',
      'no-template-curly-in-string': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-undef': 'error',
      'no-use-before-define': 'warn',
      'no-var': 'error',
      'consistent-return': 'error',
      'curly': ['error', 'multi-line'],
      'eqeqeq': 'error',
      'prefer-const': 'error',
      'no-param-reassign': 'error',
      'no-sequences': 'error',
    },
  },
]);
