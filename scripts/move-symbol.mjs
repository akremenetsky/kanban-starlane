#!/usr/bin/env node

/**
 * Move top-level exported declarations from one module to another and fix every import.
 *
 *   node scripts/move-symbol.mjs <fromFile> <toFile> <name> [<name> ...]
 *
 * - Moves functions, classes, interfaces, types, enums and `export const` (with leading comments).
 * - Creates <toFile> if needed and copies the source file's imports into it; unused imports are
 *   then removed with TypeScript's "organize imports" (also run on every file touched).
 * - Rewrites `import { name } from '<fromFile>'` everywhere to point at <toFile>.
 * - If <fromFile> still uses a moved name, it gets an import from <toFile>.
 *
 * Run `npm run format && npm run typecheck` afterwards.
 */
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const root = process.cwd();
const [fromArg, toArg, ...names] = process.argv.slice(2);
if (!fromArg || !toArg || names.length === 0) {
  console.error('usage: node scripts/move-symbol.mjs <fromFile> <toFile> <name> [<name> ...]');
  process.exit(1);
}

const fromFile = path.resolve(root, fromArg);
const toFile = path.resolve(root, toArg);
const nameSet = new Set(names);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const exts = ['.ts', '.tsx', '.d.ts'];
function resolveSpecifier(importer, spec) {
  let base;
  if (spec.startsWith('src/')) base = path.join(root, spec);
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(importer), spec);
  else return null;
  for (const c of [
    base,
    ...exts.map((e) => base + e),
    ...exts.map((e) => path.join(base, 'index' + e)),
  ]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function specifierFor(importer, target) {
  const fromDir = path.dirname(importer);
  let noExt = target.replace(/\.(d\.ts|tsx|ts)$/, '');
  if (path.basename(noExt) === 'index') noExt = path.dirname(noExt);
  const srcDir = path.join(root, 'src') + path.sep;
  if (target.startsWith(srcDir) && !noExt.startsWith(fromDir + path.sep)) {
    return 'src/' + path.relative(srcDir, noExt).split(path.sep).join('/');
  }
  let rel = path.relative(fromDir, noExt).split(path.sep).join('/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

const parse = (file, text) =>
  ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

function declaredName(stmt) {
  if (ts.isVariableStatement(stmt)) {
    const decls = stmt.declarationList.declarations;
    return decls.length === 1 && ts.isIdentifier(decls[0].name) ? decls[0].name.text : null;
  }
  return stmt.name && ts.isIdentifier(stmt.name) ? stmt.name.text : null;
}

// 1. Cut declarations out of the source file.
let fromText = fs.readFileSync(fromFile, 'utf8');
const fromSf = parse(fromFile, fromText);
const cut = [];
const importDecls = [];
for (const stmt of fromSf.statements) {
  if (ts.isImportDeclaration(stmt)) importDecls.push(stmt);
  const n = declaredName(stmt);
  if (n && nameSet.has(n)) {
    const exported = !!stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    cut.push({
      name: n,
      start: stmt.getFullStart(),
      end: stmt.getEnd(),
      declStart: stmt.getStart(fromSf),
      exported,
    });
  }
}
const missing = names.filter((n) => !cut.some((c) => c.name === n));
if (missing.length) {
  console.error(`not found as top-level declarations in ${fromArg}: ${missing.join(', ')}`);
  process.exit(1);
}

// 3. Which moved names does the source still reference? Those must be exported from the target.
let remaining = fromText;
for (const c of [...cut].sort((a, b) => b.start - a.start)) {
  remaining = remaining.slice(0, c.start) + remaining.slice(c.end);
}
const stillUsed = names.filter((n) =>
  new RegExp(`\\b${n}\\b`).test(remaining.replace(/^import[^;]*;/gm, ''))
);

const movedText = cut
  .map((c) => {
    let text = fromText.slice(c.start, c.end);
    if (!c.exported && stillUsed.includes(c.name)) {
      const at = c.declStart - c.start;
      text = text.slice(0, at) + 'export ' + text.slice(at);
    }
    return text.replace(/^\s*\n/, '');
  })
  .join('\n\n');
fromText = remaining;

// 2. Build the target: existing content + source imports (re-pointed) + moved code.
const reImports = importDecls
  .map((decl) => {
    const spec = decl.moduleSpecifier.text;
    const target = resolveSpecifier(fromFile, spec);
    const newSpec = target ? specifierFor(toFile, target) : spec;
    if (target === toFile) return '';
    return decl.getText(fromSf).replace(/(['"])[^'"]+\1\s*;?\s*$/, `'${newSpec}';`);
  })
  .filter(Boolean)
  .join('\n');

const existing = fs.existsSync(toFile) ? fs.readFileSync(toFile, 'utf8') : '';
fs.mkdirSync(path.dirname(toFile), { recursive: true });
fs.writeFileSync(toFile, `${reImports}\n${existing}\n\n${movedText}\n`);

if (stillUsed.length) {
  fromText =
    `import { ${stillUsed.join(', ')} } from '${specifierFor(fromFile, toFile)}';\n` + fromText;
}
fs.writeFileSync(fromFile, fromText);

// 4. Re-point imports across the repo.
const touched = new Set([fromFile, toFile]);
for (const file of [...walk(path.join(root, 'src')), ...walk(path.join(root, 'tests'))]) {
  const text = fs.readFileSync(file, 'utf8');
  const sf = parse(file, text);
  const edits = [];
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !stmt.importClause?.namedBindings) continue;
    if (!ts.isNamedImports(stmt.importClause.namedBindings)) continue;
    if (resolveSpecifier(file, stmt.moduleSpecifier.text) !== fromFile) continue;

    const elements = stmt.importClause.namedBindings.elements;
    const movedEls = elements.filter((e) => nameSet.has((e.propertyName ?? e.name).text));
    if (!movedEls.length) continue;

    const keptEls = elements.filter((e) => !movedEls.includes(e));
    const typeOnly = stmt.importClause.isTypeOnly ? 'type ' : '';
    const def = stmt.importClause.name ? stmt.importClause.name.text : '';
    const oldSpec = stmt.moduleSpecifier.text;
    let replacement = '';
    if (keptEls.length || def) {
      const named = keptEls.length ? `{ ${keptEls.map((e) => e.getText(sf)).join(', ')} }` : '';
      replacement += `import ${typeOnly}${[def, named].filter(Boolean).join(', ')} from '${oldSpec}';\n`;
    }
    // The target now declares these names itself.
    if (file !== toFile) {
      replacement += `import ${typeOnly}{ ${movedEls.map((e) => e.getText(sf)).join(', ')} } from '${specifierFor(file, toFile)}';`;
    }
    edits.push({ start: stmt.getStart(sf), end: stmt.getEnd(), replacement });
  }
  if (!edits.length) continue;
  let out = text;
  for (const e of edits.sort((a, b) => b.start - a.start)) {
    out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
  }
  fs.writeFileSync(file, out);
  touched.add(file);
}

// 5. Organize imports (drop unused, merge duplicates) in every touched file.
const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
const config = ts.parseJsonConfigFileContent(
  ts.readConfigFile(configPath, ts.sys.readFile).config,
  ts.sys,
  root
);
const versions = new Map();
const host = {
  getScriptFileNames: () => config.fileNames,
  getScriptVersion: (f) => String(versions.get(f) ?? 0),
  getScriptSnapshot: (f) =>
    fs.existsSync(f) ? ts.ScriptSnapshot.fromString(fs.readFileSync(f, 'utf8')) : undefined,
  getCurrentDirectory: () => root,
  getCompilationSettings: () => config.options,
  getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  readDirectory: ts.sys.readDirectory,
  directoryExists: ts.sys.directoryExists,
  getDirectories: ts.sys.getDirectories,
};
const service = ts.createLanguageService(host, ts.createDocumentRegistry());
for (const file of touched) {
  const changes = service.organizeImports({ type: 'file', fileName: file }, {}, undefined);
  for (const change of changes) {
    let text = fs.readFileSync(change.fileName, 'utf8');
    for (const tc of [...change.textChanges].sort((a, b) => b.span.start - a.span.start)) {
      text = text.slice(0, tc.span.start) + tc.newText + text.slice(tc.span.start + tc.span.length);
    }
    fs.writeFileSync(change.fileName, text);
    versions.set(change.fileName, (versions.get(change.fileName) ?? 0) + 1);
  }
}

console.log(
  `moved ${names.join(', ')} -> ${path.relative(root, toFile)}; touched ${touched.size} file(s)`
);
