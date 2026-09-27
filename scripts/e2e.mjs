#!/usr/bin/env node

/**
 * Run the WebdriverIO e2e suite. On Linux it runs under xvfb (no window) unless E2E_HEADED=1.
 * Extra arguments are passed to `wdio run`, e.g. `npm run test:e2e -- --spec tests/e2e/specs/board.e2e.ts`.
 */
import { spawnSync } from 'child_process';

const args = ['wdio', 'run', './wdio.conf.mts', ...process.argv.slice(2)];
const hasXvfb = spawnSync('which', ['xvfb-run']).status === 0;
const headless = process.platform === 'linux' && !process.env.E2E_HEADED && hasXvfb;

const [cmd, cmdArgs] = headless ? ['xvfb-run', ['-a', 'npx', ...args]] : ['npx', args];
const result = spawnSync(cmd, cmdArgs, { stdio: 'inherit' });
process.exit(result.status ?? 1);
