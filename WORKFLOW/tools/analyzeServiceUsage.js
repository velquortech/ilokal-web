#!/usr/bin/env node
// Reports a summary of how lib/api/* and lib/services/* are used across the codebase.
// Informational only — never fails the build.
'use strict';

const { readFileSync, readdirSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..', '..');

function walk(dir) {
  let files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
      files = files.concat(walk(full));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const allFiles = walk(root);
let apiImports = 0;
let serviceImports = 0;

for (const file of allFiles) {
  const src = readFileSync(file, 'utf8');
  if (/from\s+['"].*lib\/api\//.test(src)) apiImports++;
  if (/from\s+['"].*lib\/services\//.test(src)) serviceImports++;
}

console.info(`[analyze:usage] ${allFiles.length} files scanned`);
console.info(`[analyze:usage]   lib/api/*    imports: ${apiImports} files`);
console.info(`[analyze:usage]   lib/services imports: ${serviceImports} files`);
