#!/usr/bin/env node
// Ensures server actions never import from lib/services/ (HTTP round-trip anti-pattern).
// Server actions should use lib/api/*/Service and lib/api/*/Query directly.
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
    } else if (entry.isFile() && /actions\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const actionFiles = walk(root);
let hasError = false;

for (const file of actionFiles) {
  const src = readFileSync(file, 'utf8');
  if (/from\s+['"]@?\/?(\.\.\/)*lib\/services/.test(src)) {
    console.error(`[check:imports] Server action imports lib/services: ${file.replace(root, '')}`);
    hasError = true;
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.info(`[check:imports] ${actionFiles.length} action file(s) checked — no forbidden imports.`);
}
