#!/usr/bin/env node
/**
 * Claude Code PostToolUse hook: format the file that was just edited with Prettier.
 * Reads the hook payload (JSON) from stdin. Never fails the tool call.
 */
import { spawnSync } from 'child_process';
import path from 'path';

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  try {
    const file = JSON.parse(input)?.tool_input?.file_path;
    if (!file || !/\.(ts|tsx|mts|mjs|cjs|less|json)$/.test(file)) return;

    const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const rel = path.relative(root, file);
    if (rel.startsWith('..') || rel.startsWith('node_modules')) return;

    // --ignore-path keeps fixtures, vaults and vendored code untouched.
    spawnSync('npx', ['prettier', '--write', '--log-level', 'silent', rel], {
      cwd: root,
      stdio: 'ignore',
    });
  } catch {
    // formatting is best-effort
  }
});
