import globals from 'globals';
import tseslint from 'typescript-eslint';
import base from './base.js';

export default tseslint.config(...base, {
  files: ['**/*.ts'],
  languageOptions: {
    globals: {
      ...globals.node,
    },
  },
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
});
