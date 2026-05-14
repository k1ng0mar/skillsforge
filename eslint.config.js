import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      parserOptions: { ecmaVersion: 'latest', ecmaFeatures: { jsx: true }, sourceType: 'module' },
      globals: { localStorage: 'readonly', sessionStorage: 'readonly', console: 'readonly', fetch: 'readonly', setTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', document: 'readonly', window: 'readonly' },
    },
    rules: {
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react-hooks/rules-of-hooks': 'off',
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },
];