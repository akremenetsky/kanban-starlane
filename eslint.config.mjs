import js from '@eslint/js';
import obsidianmd from 'eslint-plugin-obsidianmd';
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
  },
  // Rules of the Obsidian community plugin review (the same set its automated check runs).
  // Applied to plugin code only; it needs type information for the typed rules.
  ...obsidianmd.configs.recommended.map((config) => {
    if (config.files?.includes('package.json')) return config;
    // Narrow every file pattern to `src/` (nested arrays are AND-ed by ESLint).
    const files = (config.files ?? ['**/*']).map((pattern) => [
      'src/**/*.{ts,tsx}',
      ...[pattern].flat(),
    ]);
    return { ...config, files };
  }),
  {
    files: ['package.json'],
    rules: {
      // moment backs the fake Obsidian API in unit tests (the app provides its own), and the React
      // plugin is lint tooling: neither ships in main.js.
      'depend/ban-dependencies': ['error', { allowed: ['moment', 'eslint-plugin-react'] }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // Inherited code is loosely typed (Obsidian internals, mdast, flatpickr); the review only
      // warns about it. Tracked in docs/dev/known-issues.md, not enforced here.
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      // TypeScript itself reports undefined names.
      'no-undef': 'off',
      // Type-aware rules that find real bugs, but not ones the review blocks on: warn only.
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/unbound-method': 'warn',
      '@typescript-eslint/no-base-to-string': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/restrict-plus-operands': 'warn',
      '@typescript-eslint/await-thenable': 'warn',
      '@typescript-eslint/prefer-promise-reject-errors': 'warn',
      '@typescript-eslint/no-for-in-array': 'warn',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      // `@ts-ignore` needs a reason, as the review asks for every directive comment.
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': 'allow-with-description' }],
    },
  }
);
