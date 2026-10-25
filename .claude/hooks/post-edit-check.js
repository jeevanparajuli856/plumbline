#!/usr/bin/env node
'use strict';
/**
 * PostToolUse (Edit|Write|MultiEdit): fast correctness feedback, warnings only.
 *   - .ts/.tsx : tsc --noEmit (incremental) scoped to the nearest tsconfig,
 *                reporting only lines about the edited file.
 *   - .py      : ruff check on the file.
 *   - any JS/TS: warn on console.log outside tests/scripts.
 * Exit 0 always; findings are returned as additionalContext so Claude sees them without being blocked.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { readStdinJson, editedFiles, findUp, emitContext } = require('./lib/hook-input');

const SKIP = /(^|\/)(node_modules|dist|build|\.venv|\.claude\/hooks)\//;
const TEST_FILE = /(\.test\.|\.spec\.|__tests__\/|\/tests?\/|\/scripts?\/|\/e2e\/)/;


function typecheck(file) {
  const tsRoot = findUp(path.dirname(file), 'tsconfig.json');
  if (!tsRoot) return [];
  const pkgRoot = findUp(tsRoot, 'node_modules') || tsRoot;
  const tsc = path.join(pkgRoot, 'node_modules', '.bin', 'tsc');
  if (!fs.existsSync(tsc)) return [];
  const cacheDir = path.join(pkgRoot, 'node_modules', '.cache', 'truehand-hooks');
  fs.mkdirSync(cacheDir, { recursive: true });
  const buildInfo = path.join(cacheDir, path.basename(tsRoot) + '.tsbuildinfo');
  try {
    execFileSync(
      tsc,
      ['--noEmit', '--pretty', 'false', '--incremental', '--tsBuildInfoFile', buildInfo],
      { cwd: tsRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 45000 },
    );
    return [];
  } catch (err) {
    const out = `${err.stdout || ''}${err.stderr || ''}`;
    const rel = path.relative(tsRoot, file);
    const hits = out.split('\n').filter((l) => l.includes(rel) || l.includes(file)).slice(0, 8);
    return hits.length ? [`[hook] tsc: ${hits.length} error(s) in ${rel}`, ...hits] : [];
  }
}

function ruffCheck(file) {
  const pyRoot = findUp(path.dirname(file), 'pyproject.toml') || path.dirname(file);
  const attempts = [
    ['ruff', ['check', '--quiet', '--output-format', 'concise', file]],
    ['uv', ['run', '--quiet', 'ruff', 'check', '--quiet', '--output-format', 'concise', file]],
  ];
  for (const [cmd, args] of attempts) {
    try {
      execFileSync(cmd, args, { cwd: pyRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000 });
      return [];
    } catch (err) {
      if (err.code === 'ENOENT') continue; // tool missing, try next
      const out = `${err.stdout || ''}`.trim();
      if (!out) continue;
      const lines = out.split('\n').slice(0, 8);
      return [`[hook] ruff: issues in ${path.basename(file)}`, ...lines];
    }
  }
  return [];
}

function consoleLogWarn(file) {
  if (TEST_FILE.test(file)) return [];
  let src = '';
  try {
    src = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const n = (src.match(/console\.log\(/g) || []).length;
  return n ? [`[hook] ${n} console.log call(s) in ${path.basename(file)} - remove before commit or use a logger.`] : [];
}

(async () => {
  const input = await readStdinJson();
  const findings = [];
  for (const f of editedFiles(input)) {
    const file = path.resolve(f);
    if (SKIP.test(file) || !fs.existsSync(file)) continue;
    try {
      if (/\.(ts|tsx)$/i.test(file)) findings.push(...typecheck(file));
      if (/\.(ts|tsx|js|jsx)$/i.test(file)) findings.push(...consoleLogWarn(file));
      if (/\.py$/i.test(file)) findings.push(...ruffCheck(file));
    } catch {
      /* best-effort */
    }
  }
  emitContext('PostToolUse', findings);
  process.exit(0);
})();
