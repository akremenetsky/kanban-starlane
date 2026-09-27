/**
 * Build script.
 *
 *   node esbuild.config.mjs              -> dev build, watch mode, inline sourcemaps
 *   node esbuild.config.mjs production   -> minified one-off build
 *
 * Output goes to dist/ (main.js, styles.css, manifest.json). After every build the
 * output is also copied into the plugin folder of the in-repo test vault and, if set,
 * into $OBSIDIAN_PLUGIN_DIR (e.g. a plugin folder in your real vault).
 */
import builtins from 'builtin-modules';
import esbuild from 'esbuild';
import { lessLoader } from 'esbuild-plugin-less';
import fs from 'fs';
import path from 'path';
import process from 'process';

import { NodeModulesPolyfillPlugin, replace } from './scripts/esbuild-plugins.mjs';

const isProd = process.argv[2] === 'production';
const outdir = 'dist';
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));

const installTargets = [path.join('test-vault', '.obsidian', 'plugins', manifest.id)];
if (process.env.OBSIDIAN_PLUGIN_DIR) installTargets.push(process.env.OBSIDIAN_PLUGIN_DIR);

const artifacts = ['main.js', 'styles.css', 'manifest.json'];

const installPlugin = {
  name: 'install-plugin',
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length) return;

      fs.copyFileSync('manifest.json', path.join(outdir, 'manifest.json'));

      for (const target of installTargets) {
        fs.mkdirSync(target, { recursive: true });
        for (const file of artifacts) {
          fs.copyFileSync(path.join(outdir, file), path.join(target, file));
        }
        // Tells the Hot Reload plugin (if installed) to reload on change.
        fs.writeFileSync(path.join(target, '.hotreload'), '');
      }

      console.log(
        `[build] ${new Date().toLocaleTimeString()} -> ${[outdir, ...installTargets].join(', ')}`
      );
    });
  },
};

const context = await esbuild.context({
  entryPoints: { main: './src/main.ts', styles: './src/styles.less' },
  bundle: true,
  define: {
    global: 'window',
  },
  plugins: [
    NodeModulesPolyfillPlugin(),
    lessLoader(),
    // Obsidian supports pop-out windows; timers must run on the active window.
    replace({
      include: /node_modules\/.*/,
      values: {
        setTimeout: 'activeWindow.setTimeout',
        clearTimeout: 'activeWindow.clearTimeout',
        requestAnimationFrame: 'activeWindow.requestAnimationFrame',
        cancelAnimationFrame: 'activeWindow.cancelAnimationFrame',
      },
    }),
    installPlugin,
  ],
  external: [
    'obsidian',
    'electron',
    '@codemirror/autocomplete',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/view',
    '@lezer/common',
    '@lezer/highlight',
    '@lezer/lr',
    'node:*',
    ...builtins,
  ],
  format: 'cjs',
  target: 'es2018',
  logLevel: 'info',
  sourcemap: isProd ? false : 'inline',
  treeShaking: true,
  outdir,
  minify: isProd,
});

if (isProd) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
