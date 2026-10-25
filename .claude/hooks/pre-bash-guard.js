#!/usr/bin/env node
'use strict';
/**
 * PreToolUse (Bash): a few hard guards for a fast-moving repo.
 *   BLOCK  git commit/push with --no-verify
 *   BLOCK  force-push to main/master
 *   BLOCK  recursive delete of the repo root or a worktree root
 *   WARN   `git push` (remind to review the diff) and dev servers in foreground
 */
const { readStdinJson, emitContext } = require('./lib/hook-input');

(async () => {
  const input = await readStdinJson();
  const cmd = String((input.tool_input && input.tool_input.command) || '');
  if (!cmd) process.exit(0);

  const block = (msg) => {
    process.stderr.write(`[hook] BLOCKED: ${msg}\n`);
    process.exit(2);
  };

  if (/\bgit\b[^\n|;&]*\b(commit|push)\b[^\n|;&]*\s(--no-verify|-n)\b/.test(cmd))
    block('--no-verify skips the quality gate. Fix the failing check instead.');

  if (/\bgit\s+push\b[^\n|;&]*(--force\b|-f\b|--force-with-lease\b)[^\n|;&]*\b(main|master)\b/.test(cmd) ||
      /\bgit\s+push\b[^\n|;&]*\b(main|master)\b[^\n|;&]*(--force\b|-f\b)/.test(cmd))
    block('force-pushing main/master rewrites shared history. Open a PR instead.');

  if (/\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\s+("?\$CLAUDE_PROJECT_DIR"?|\.\.?\/?|\/|~\/?)(\s|$)/.test(cmd))
    block('recursive delete of a project or home root.');

  const warnings = [];
  if (/\bgit\s+push\b/.test(cmd) && !/--dry-run/.test(cmd))
    warnings.push('[hook] pushing - make sure `git diff origin/main...HEAD` was reviewed and tests pass.');
  if (/\b(pnpm|npm|yarn)\s+(run\s+)?dev\b/.test(cmd) && !/&\s*$|run_in_background|nohup|tmux/.test(cmd))
    warnings.push('[hook] dev server in the foreground will block this shell; run it in the background and read the log.');
  emitContext('PreToolUse', warnings);
  process.exit(0);
})();
