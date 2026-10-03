/**
 * Builds the plugin and installs (or updates) it in a vault:
 *   npm run install-plugin -- <path to vault>
 * Copies main.js, manifest.json and styles.css into <vault>/.obsidian/plugins/<id>/.
 * Existing plugin data (data.json) is left untouched.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const vaultArg = process.argv[2];
if (!vaultArg) {
  console.error('Usage: npm run install-plugin -- <path to vault>');
  process.exit(1);
}

const vault = path.resolve(vaultArg.replace(/^~(?=$|\/)/, process.env.HOME ?? '~'));
if (!fs.existsSync(vault) || !fs.statSync(vault).isDirectory()) {
  console.error(`Vault folder not found: ${vault}`);
  process.exit(1);
}
if (!fs.existsSync(path.join(vault, '.obsidian'))) {
  console.error(`Not an Obsidian vault (no .obsidian folder): ${vault}`);
  process.exit(1);
}

execFileSync(process.execPath, ['esbuild.config.mjs', 'production'], { stdio: 'inherit' });

const { id } = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const target = path.join(vault, '.obsidian', 'plugins', id);
const existed = fs.existsSync(target);
fs.mkdirSync(target, { recursive: true });

for (const file of ['main.js', 'manifest.json', 'styles.css']) {
  fs.copyFileSync(path.join('dist', file), path.join(target, file));
}

console.log(`${existed ? 'Updated' : 'Installed'} ${id} in ${target}`);
console.log(
  existed
    ? 'Reload the plugin (toggle it off/on) or run "Reload app without saving" in Obsidian.'
    : 'Enable it in Settings → Community plugins.'
);
