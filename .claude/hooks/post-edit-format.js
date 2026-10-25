#!/usr/bin/env node
'use strict';
/**
 * PostToolUse (Edit|Write|MultiEdit): auto-format the edited file.
 *   - .ts .tsx .js .jsx .css .json .md .html  -> prettier (local node_modules/.bin only)
 *   - .py                                      -> ruff format (PATH or `uv run`)
 * Never blocks. Silent when the formatter is missing.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { readStdinJson, editedFiles, findUp } = require('./lib/hook-input');

const PRETTIER_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|css|json|md|html)$/i;
const SKIP = /(^|\/)(node_modules|dist|build|\.venv|\.claude\/hooks)\//;

function formatWithPrettier(file) {
  const root = findUp(path.dirname(file), 'node_modules');
  if (!root) return;
  const bin = path.join(root, 'node_modules', '.bin', 'prettier');
  if (!fs.existsSync(bin)) return;
  execFileSync(bin, ['--write', '--log-level', 'silent', file], {
    cwd: root,
    stdio: 'ignore',
    timeout: 15000,
  });
}

function formatWithRuff(file) {
  const pyRoot = findUp(path.dirname(file), 'pyproject.toml') || path.dirname(file);
  const attempts = [
    ['ruff', ['format', '--quiet', file]],
    ['uv', ['run', '--quiet', 'ruff', 'format', '--quiet', file]],
  ];
  for (const [cmd, args] of attempts) {
    try {
      execFileSync(cmd, args, { cwd: pyRoot, stdio: 'ignore', timeout: 15000 });
      return;
    } catch {
      /* try next */
    }
  }
}

(async () => {
  const input = await readStdinJson();
  for (const f of editedFiles(input)) {
    const file = path.resolve(f);
    if (SKIP.test(file) || !fs.existsSync(file)) continue;
    try {
      if (PRETTIER_EXT.test(file)) formatWithPrettier(file);
      else if (/\.py$/i.test(file)) formatWithRuff(file);
    } catch {
      /* formatting is best-effort */
    }
  }
  process.exit(0);
})();
