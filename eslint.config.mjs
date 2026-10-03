import eslintReact from '@eslint-react/eslint-plugin';
import js from '@eslint/js';
import obsidianmd from 'eslint-plugin-obsidianmd';
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
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
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
    files: ['src/**/*.tsx', 'tests/**/*.tsx'],
    ...eslintReact.configs['recommended-typescript'],
    rules: {
      ...eslintReact.configs['recommended-typescript'].rules,
      // Replaces eslint-plugin-react (flagged by the review scanner). These rules go beyond what
      // that plugin checked; adopting them means reviewing every hook's dependencies, not done yet.
      '@eslint-react/exhaustive-deps': 'off',
      '@eslint-react/set-state-in-effect': 'off',
      '@eslint-react/use-state': 'off',
      '@eslint-react/naming-convention-ref-name': 'off',
      '@eslint-react/no-array-index-key': 'off',
      '@eslint-react/no-unnecessary-use-prefix': 'off',
      '@eslint-react/web-api-no-leaked-timeout': 'off',
      // Flags Obsidian Component subclasses as if they were React class components.
      '@eslint-react/no-unused-class-component-members': 'off',
    },
  },
  {
    // Inherited hook calls the rule cannot prove safe (configured here: the review scanner does
    // not load this plugin, so an inline disable comment would be an error there). Kanban.tsx
    // calls hooks after the parse-error view's early return, which stays until the file is
    // reopened; DragDropApp.tsx calls useMemo in a render prop that DragOverlay always runs.
    files: ['src/components/Kanban.tsx', 'src/view/DragDropApp.tsx'],
    rules: { '@eslint-react/rules-of-hooks': 'off' },
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
    rules: {},
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
      // Everything the review scanner reports is an error here (it shows each one as a risk on
      // the plugin page); `npm run lint:scanner` runs the scanner's own setup on top.
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-this-alias': 'error',
      '@typescript-eslint/no-deprecated': 'error',
      // TypeScript itself reports undefined names.
      'no-undef': 'off',
      // Type-aware rules the scanner does not run (or only warns about): warnings here.
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
      // Errors in the review scanner on top of the recommended set.
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-unsanitized/method': 'error',
      'no-unsanitized/property': 'error',
      'obsidianmd/regex-lookbehind': 'error',
      'obsidianmd/no-forbidden-elements': 'error',
      // `@ts-ignore` needs a reason, as the review asks for every directive comment.
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': 'allow-with-description' }],
    },
  },
  {
    // After the Obsidian set, which turns this rule off.
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    ignores: ['src/shared/moment.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'obsidian',
              importNames: ['moment'],
              message: "Import moment from 'src/shared/moment' (typed for the review scanner).",
            },
          ],
        },
      ],
    },
  }
);
