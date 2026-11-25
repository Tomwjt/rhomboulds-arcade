import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/'] },
  js.configs.recommended,
  {
    // Browser code shipped to the page.
    files: ['src/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    // Build config, scripts and tests run in Node.
    files: ['*.config.js', 'scripts/**/*.js', 'tests/**/*.js'],
    languageOptions: { globals: globals.node },
  },
];
