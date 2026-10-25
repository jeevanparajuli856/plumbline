#!/usr/bin/env node
'use strict';
/**
 * SessionStart: print a compact project briefing into Claude's context.
 * Branch, worktree lane, dirty files, recent commits, bootstrap state, days to finals.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { projectDir } = require('./lib/hook-input');

const root = projectDir();
const sh = (c) => {
  try {
    return execSync(c, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 4000 }).trim();
  } catch {
    return '';
  }
};
const exists = (p) => fs.existsSync(path.join(root, p));

const branch = sh('git rev-parse --abbrev-ref HEAD') || '(no git)';
const dirty = sh('git status --porcelain').split('\n').filter(Boolean).length;
const recent = sh('git log --oneline -5');
const laneFile = path.join(root, '.lane');
const lane = fs.existsSync(laneFile) ? fs.readFileSync(laneFile, 'utf8').trim() : null;
const worktrees = sh('git worktree list --porcelain').split('\n').filter((l) => l.startsWith('worktree ')).length;

const finals = new Date('2026-12-14T09:00:00-06:00');
const daysToFinals = Math.ceil((finals - Date.now()) / 86400000);

const state = [
  `web app: ${exists('apps/web/package.json') ? 'bootstrapped' : 'NOT bootstrapped (run /bootstrap)'}`,
  `engine:  ${exists('engine/pyproject.toml') ? 'present' : 'NOT present (drop handsight code into engine/, see docs/ARCHITECTURE.md)'}`,
  `api:     ${exists('engine/plumbline_api') || exists('engine/api') ? 'present' : 'not yet'}`,
];

const lines = [
  '## Truehand session briefing',
  `branch: ${branch}${lane ? `  | lane: ${lane}` : ''}  | worktrees: ${worktrees || 1}  | uncommitted files: ${dirty}`,
  `days to Nexus finals (Dec 14 2026): ${daysToFinals}`,
  ...state,
  recent ? `recent commits:\n${recent}` : 'no commits yet',
  'Start here: CLAUDE.md -> docs/BUILD_PLAN.md (current slice) -> docs/ARCHITECTURE.md.',
  'Parallel work: /lanes. Verification: /verify. Demo replay: /demo-worked-example.',
];
process.stdout.write(lines.join('\n') + '\n');
process.exit(0);
