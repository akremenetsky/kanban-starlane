import js from '@eslint/js';
import react from 'eslint-plugin-react';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'main.js',
      'dist/**',
      'coverage/**',
      'scripts/buffer-es6.mjs',
      'node_modules/**',
      'test-vault/**',
      '.obsidian-cache/**',
      'tests/e2e/.artifacts/**',
      'site/**',
      '.venv-docs/**',
      '.cache/**',
      // Vendored third-party code, kept close to upstream.
      'src/components/Editor/flatpickr/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    plugins: { react },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: '18.0' } },
    rules: {
      ...react.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
      // Preact uses `class` fine, but keep JSX consistent with React naming.
      'react/no-unknown-property': ['error', { ignore: ['class'] }],

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { args: 'none', ignoreRestSiblings: true, caughtErrors: 'none' },
      ],
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true }],

      // Obsidian exposes `window.app`; plugins must use `this.app` / an injected App instead.
      'no-restricted-globals': [
        'error',
        { name: 'app', message: 'Use the App instance passed in (plugin.app / stateManager.app).' },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'linebreak-style': ['error', 'unix'],
    },
  },
  {
    files: ['tests/e2e/**/*.ts'],
    languageOptions: { globals: { ...globals.mocha, ...globals.node } },
  },
  {
    files: ['*.mjs', '*.cjs', '*.mts', 'scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  }
);
