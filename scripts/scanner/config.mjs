// The lint setup of the Obsidian community directory's automated review ("scanner"), as run by
// obsidianmd/obsidian-workflows (src/lint.ts, commit 8167cae). Every finding it reports shows
// up as a "Review: Risks" issue on the plugin's page, so `npm run lint:scanner` runs the same
// rules and fails on any finding. Keep in sync when the scanner changes.

/** Paths the scanner skips, for both ESLint and Stylelint. */
export const IGNORES = [
  'node_modules',
  'dist',
  'build',
  'pkg',
  'test-vault',
  '.obsidian',
  '**/.obsidian/**',
  'esbuild.config.mjs',
  'version-bump.mjs',
  '**/*.test.*',
  '**/*.tests.*',
  '**/*.spec.*',
  '**/*.specs.*',
  '**/test/**',
  '**/tests/**',
  '**/__tests__/**',
  '**/mocks/**',
  '**/__mocks__/**',
  '**/*.cjs',
  '**/*.mjs',
  '**/*.cts',
  '**/*.mts',
  '**/vite*',
  '**/scripts/**',
  '**/docs/**',
  '**/i18n/**',
  '**/i18next/**',
  '**/locale/**',
  '**/locales/**',
  '**/translations/**',
  '**/l10n/**',
  '.pnpm-store',
  '**/*.spec.ts',
  '**/testUtils**',
  'automation/**',
  'e2e-tests/**',
];

/** Stylelint config; the scanner sets `browsers` from manifest.json minAppVersion. */
export function stylelintConfig(minElectron) {
  return {
    plugins: ['stylelint-no-unsupported-browser-features'],
    ignoreDisables: true,
    ignoreFiles: IGNORES,
    rules: {
      'function-url-scheme-disallowed-list': [['http', 'https', 'file'], { severity: 'error' }],
      'function-url-scheme-allowed-list': ['data'],
      'declaration-no-important': [true, { severity: 'warning' }],
      'color-named': ['never', { severity: 'warning' }],
      'declaration-block-no-duplicate-properties': [true, { severity: 'warning' }],
      'plugin/no-unsupported-browser-features': [
        true,
        {
          severity: 'warning',
          browsers: [`electron >= ${minElectron}`],
          ignore: ['css-nesting', 'css-cascade-layers'],
        },
      ],
      'selector-pseudo-class-disallowed-list': [['has'], { severity: 'warning' }],
      'selector-pseudo-class-no-unknown': [
        true,
        { ignorePseudoClasses: ['global', 'local'], severity: 'warning' },
      ],
      'selector-pseudo-element-no-unknown': [true, { severity: 'warning' }],
      'selector-type-no-unknown': [true, { ignoreTypes: [], severity: 'warning' }],
      'at-rule-no-unknown': [
        true,
        { ignoreAtRules: ['layer', 'property', 'container'], severity: 'warning' },
      ],
      'unit-no-unknown': [true, { severity: 'warning' }],
      'property-disallowed-list': [['all'], { severity: 'warning' }],
    },
  };
}

// Electron version of each Obsidian release that first shipped it (scanner's table).
const ELECTRON_VERSIONS = {
  25: '1.4.5',
  28: '1.5.8',
  30: '1.6.5',
  31: '1.7.4',
  37: '1.9.12',
  39: '1.11.4',
};

/** Oldest Electron a plugin with this minAppVersion runs on, as the scanner computes it. */
export function minElectronVersion(minAppVersion) {
  const num = (v) => {
    const [a = 0, b = 0, c = 0] = v.split('.').map(Number);
    return a * 100_000 + b * 1_000 + c;
  };
  let result = Math.min(...Object.keys(ELECTRON_VERSIONS).map(Number));
  for (const [electron, obsidian] of Object.entries(ELECTRON_VERSIONS)) {
    if (num(obsidian) <= num(minAppVersion)) result = Math.max(result, Number(electron));
  }
  return result;
}
