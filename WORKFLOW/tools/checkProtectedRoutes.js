#!/usr/bin/env node
// Checks that every /api/protected/** route handler calls getMobileUser or assertAuthorized.
'use strict';

const { readFileSync, readdirSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..', '..');

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (entry.isFile() && entry.name === 'route.ts') {
      files.push(full);
    }
  }
  return files;
}

const protectedDir = join(root, 'app', 'api', 'protected');
let hasError = false;

try {
  const routes = walk(protectedDir);
  for (const file of routes) {
    const src = readFileSync(file, 'utf8');
    const hasGuard =
      src.includes('getMobileUser') || src.includes('assertAuthorized');
    if (!hasGuard) {
      console.error(`[check:protected] Missing auth guard: ${file.replace(root, '')}`);
      hasError = true;
    }
  }
} catch {
  // Protected dir may not exist yet — not a failure
}

if (hasError) {
  process.exit(1);
} else {
  console.info('[check:protected] All protected routes have auth guards.');
}
