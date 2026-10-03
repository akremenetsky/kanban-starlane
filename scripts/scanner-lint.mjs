// Runs the Obsidian community review scanner's ESLint and Stylelint checks on the tracked files
// and fails on any finding, warnings included: each one is a "Review: Risks" issue on the
// plugin page. `--json <file>` also writes all findings for tooling.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { minElectronVersion, stylelintConfig } from './scanner/config.mjs';

const root = path.resolve(import.meta.dirname, '..');
const bin = (name) => path.join(root, 'node_modules', '.bin', name);
const jsonOut = process.argv.includes('--json')
  ? process.argv[process.argv.indexOf('--json') + 1]
  : null;

const findings = [];

// The scanner lints a fresh checkout, so only tracked files count.
const tracked = (...patterns) =>
  execFileSync('git', ['ls-files', ...patterns], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);

// ESLint: its ignore list does the scoping, as in the scanner.
const eslint = spawnSync(
  bin('eslint'),
  [
    '--config',
    path.join(root, 'scripts/scanner/eslint.config.mjs'),
    '--format',
    'json',
    '--no-warn-ignored',
    ...tracked('*.ts', '*.tsx', '*.js', '*.jsx', '*.cts', '*.mts', '*.cjs', '*.mjs', '*.json'),
  ],
  { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
);
if (!eslint.stdout) {
  process.stderr.write(eslint.stderr);
  process.exit(2);
}
for (const file of JSON.parse(eslint.stdout)) {
  for (const m of file.messages) {
    findings.push({
      tool: 'eslint',
      file: path.relative(root, file.filePath),
      line: m.line,
      rule: m.ruleId ?? 'eslint-fatal',
      message: m.message,
    });
  }
}

// Stylelint over the .css files the scanner's directory walk finds (it skips these folders).
const skippedDirs = new Set(['node_modules', 'dist', 'build', '.git', '.obsidian']);
const cssFiles = tracked('*.css').filter((f) => !f.split('/').some((d) => skippedDirs.has(d)));
if (cssFiles.length) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  // In the root like the scanner's, since Stylelint resolves `ignoreFiles` from the config's folder.
  const configPath = path.join(root, '.stylelintrc.scanner.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify(stylelintConfig(minElectronVersion(manifest.minAppVersion)))
  );
  const stylelint = spawnSync(
    bin('stylelint'),
    [
      ...cssFiles,
      '--config',
      configPath,
      '--config-basedir',
      path.join(root, 'node_modules'),
      '--formatter',
      'json',
      '--allow-empty-input',
    ],
    { cwd: root, encoding: 'utf8' }
  );
  fs.rmSync(configPath);
  const out = stylelint.stderr.match(/^[ \t]*(\[.*\])[ \t]*$/m)?.[1] ?? stylelint.stdout;
  for (const file of JSON.parse(out || '[]')) {
    for (const w of file.warnings) {
      findings.push({
        tool: 'stylelint',
        file: path.relative(root, file.source),
        line: w.line,
        rule: w.rule,
        message: w.text,
      });
    }
  }
}

if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(findings, null, 2));

for (const f of findings) console.log(`${f.file}:${f.line}  ${f.rule}  ${f.message}`);
if (findings.length) {
  const byRule = {};
  for (const f of findings) byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;
  console.log('\nBy rule:');
  for (const [rule, n] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${rule}`);
  }
  console.log(`\n${findings.length} finding(s) the Obsidian review scanner would report.`);
  process.exit(1);
}
console.log('Obsidian review scanner: no findings.');
