#!/usr/bin/env node

/**
 * Remove unused imports and merge duplicates using TypeScript's "organize imports".
 *
 *   node scripts/organize-imports.mjs src/a.ts src/b.tsx ...
 *
 * Run `npm run format` afterwards (prettier sorts the import groups).
 */
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const root = process.cwd();
const files = process.argv.slice(2).map((f) => path.resolve(root, f));
if (!files.length) {
  console.error('usage: node scripts/organize-imports.mjs <file> [<file> ...]');
  process.exit(1);
}

const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
const config = ts.parseJsonConfigFileContent(
  ts.readConfigFile(configPath, ts.sys.readFile).config,
  ts.sys,
  root
);
const versions = new Map();
const service = ts.createLanguageService(
  {
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
  },
  ts.createDocumentRegistry()
);

for (const file of files) {
  for (const change of service.organizeImports({ type: 'file', fileName: file }, {}, undefined)) {
    let text = fs.readFileSync(change.fileName, 'utf8');
    for (const tc of [...change.textChanges].sort((a, b) => b.span.start - a.span.start)) {
      text = text.slice(0, tc.span.start) + tc.newText + text.slice(tc.span.start + tc.span.length);
    }
    fs.writeFileSync(change.fileName, text);
    versions.set(change.fileName, (versions.get(change.fileName) ?? 0) + 1);
  }
}
