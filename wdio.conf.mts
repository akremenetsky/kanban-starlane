/**
 * End-to-end tests: real Obsidian (downloaded into .obsidian-cache/) driven by WebdriverIO.
 *
 *   npm run test:e2e                 # build + run all specs (headless via xvfb on Linux)
 *   E2E_HEADED=1 npm run test:e2e    # watch it run
 *   E2E_VERSIONS=all npm run test:e2e  # also run against manifest.json minAppVersion
 */
import * as path from 'path';

const cacheDir = path.resolve('.obsidian-cache');

const versions: Array<[app: string, installer: string]> =
  process.env.E2E_VERSIONS === 'all'
    ? [
        ['earliest', 'earliest'],
        ['latest', 'latest'],
      ]
    : [['latest', 'latest']];

export const config: WebdriverIO.Config = {
  runner: 'local',
  framework: 'mocha',
  specs: ['./tests/e2e/specs/**/*.e2e.ts'],
  maxInstances: Number(process.env.E2E_MAX_INSTANCES ?? 2),

  capabilities: versions.map(([appVersion, installerVersion]) => ({
    browserName: 'obsidian',
    browserVersion: appVersion,
    'wdio:obsidianOptions': {
      installerVersion,
      // Built by `npm run build` (main.js, manifest.json, styles.css).
      plugins: ['./dist'],
      vault: 'tests/e2e/vaults/basic',
    },
  })),

  services: ['obsidian'],
  reporters: ['obsidian'],
  cacheDir,

  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
  logLevel: 'warn',
  outputDir: 'tests/e2e/.artifacts',

  afterTest: async function (test, _context, { passed }) {
    if (!passed) {
      const name = `${test.parent} ${test.title}`.replace(/[^a-z0-9]+/gi, '-');
      await browser.saveScreenshot(`tests/e2e/.artifacts/${name}.png`);
    }
  },
};
