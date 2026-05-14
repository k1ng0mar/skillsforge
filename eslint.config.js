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
      globals: { localStorage: 'readonly', sessionStorage: 'readonly', console: 'readonly', fetch: 'readonly', setTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', clearTimeout: 'readonly', document: 'readonly', window: 'readonly', Blob: 'readonly', URL: 'readonly', FileReader: 'readonly', requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly', confirm: 'readonly' },
    },
    rules: {
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'no-unused-vars': 'off',
      'no-undef': 'error',
    },
  },
];