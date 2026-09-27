#!/usr/bin/env node

/**
 * Move/rename TypeScript modules and rewrite every import that points at them.
 *
 *   node scripts/mv.mjs src/old/File.ts src/new/File.ts [more pairs...]
 *   node scripts/mv.mjs --normalize          # only rewrite specifiers to the house style
 *
 * House style for import specifiers (applied to every specifier the script touches):
 *   - target in the importer's directory or below  -> relative:  './x', './sub/y'
 *   - anything else inside src/                     -> absolute:  'src/dir/x'
 *   - tests importing tests                         -> relative
 * Extensions and trailing '/index' are dropped.
 *
 * Files are moved with `git mv`, so history follows them.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const args = process.argv.slice(2);
const normalizeAll = args[0] === '--normalize';
const pairs = normalizeAll ? [] : args;

if (!normalizeAll && (pairs.length === 0 || pairs.length % 2 !== 0)) {
  console.error('usage: node scripts/mv.mjs <from> <to> [<from> <to> ...] | --normalize');
  process.exit(1);
}

const exts = ['.ts', '.tsx', '.d.ts', '.js', '.mjs'];

// Vendored code keeps its upstream import style unless one of its targets moves.
const vendored = [path.join(root, 'src/components/Editor/flatpickr') + path.sep];
const isVendored = (file) => vendored.some((v) => file.startsWith(v));

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const sourceFiles = [...walk(path.join(root, 'src')), ...walk(path.join(root, 'tests'))];

function resolveSpecifier(fromFile, spec) {
  let base;
  if (spec.startsWith('src/')) base = path.join(root, spec);
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else return null;

  const candidates = [
    base,
    ...exts.map((e) => base + e),
    ...exts.map((e) => path.join(base, 'index' + e)),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function specifierFor(fromFile, target) {
  const fromDir = path.dirname(fromFile);
  let noExt = target.replace(/\.(d\.ts|tsx|ts|mjs|js)$/, '');
  if (path.basename(noExt) === 'index') noExt = path.dirname(noExt);

  const srcDir = path.join(root, 'src') + path.sep;
  const inSrc = target.startsWith(srcDir);
  const isBelow = noExt.startsWith(fromDir + path.sep);
  const fromTests = fromFile.startsWith(path.join(root, 'tests') + path.sep);

  if (inSrc && !isBelow && !(fromTests && !inSrc)) {
    return 'src/' + path.relative(srcDir, noExt).split(path.sep).join('/');
  }

  let rel = path.relative(fromDir, noExt).split(path.sep).join('/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

// 1. Plan moves (absolute paths).
const moves = new Map();
for (let i = 0; i < pairs.length; i += 2) {
  const from = path.resolve(root, pairs[i]);
  const to = path.resolve(root, pairs[i + 1]);
  if (!fs.existsSync(from)) {
    console.error(`missing: ${pairs[i]}`);
    process.exit(1);
  }
  if (fs.existsSync(to)) {
    console.error(`already exists: ${pairs[i + 1]}`);
    process.exit(1);
  }
  moves.set(from, to);
}

// 2. Compute rewrites against the *old* layout, then write them to the new locations.
const specRe =
  /((?:import|export)\s[^'"]*?from\s*|import\s*\(\s*|import\s+|vi\.mock\(\s*)(['"])([^'"]+)\2/g;

const rewrites = new Map(); // newFilePath -> content
for (const file of sourceFiles) {
  const newFile = moves.get(file) ?? file;
  const src = fs.readFileSync(file, 'utf8');
  let changed = false;

  const out = src.replace(specRe, (whole, prefix, quote, spec) => {
    const target = resolveSpecifier(file, spec);
    if (!target) return whole;

    const newTarget = moves.get(target) ?? target;
    const touched = (normalizeAll && !isVendored(file)) || moves.has(file) || moves.has(target);
    if (!touched) return whole;

    // Keep non-code assets (e.g. .less) as literal relative paths.
    if (!/\.(ts|tsx)$/.test(newTarget)) {
      let rel = path.relative(path.dirname(newFile), newTarget).split(path.sep).join('/');
      if (!rel.startsWith('.')) rel = './' + rel;
      if (rel === spec) return whole;
      changed = true;
      return `${prefix}${quote}${rel}${quote}`;
    }

    const next = specifierFor(newFile, newTarget);
    if (next === spec) return whole;
    changed = true;
    return `${prefix}${quote}${next}${quote}`;
  });

  if (changed || moves.has(file)) rewrites.set(file, out);
}

// 3. Move files with git, then write rewritten content.
for (const [from, to] of moves) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  execFileSync('git', ['mv', path.relative(root, from), path.relative(root, to)], {
    stdio: 'inherit',
  });
}
for (const [file, content] of rewrites) {
  fs.writeFileSync(moves.get(file) ?? file, content);
}

// 4. Remove directories left empty by the moves.
for (const from of moves.keys()) {
  let dir = path.dirname(from);
  while (
    dir.startsWith(path.join(root, 'src')) &&
    fs.existsSync(dir) &&
    fs.readdirSync(dir).length === 0
  ) {
    fs.rmdirSync(dir);
    dir = path.dirname(dir);
  }
}

console.log(`moved ${moves.size} file(s), rewrote imports in ${rewrites.size} file(s)`);
