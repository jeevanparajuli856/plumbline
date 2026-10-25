'use strict';
/**
 * Shared stdin reader for Truehand hooks.
 * Reads the JSON payload Claude Code sends to a hook, capped at 1 MiB.
 * Returns {} on any failure so hooks always fail open.
 */
const MAX_STDIN = 1024 * 1024;

function readStdinJson() {
  return new Promise((resolve) => {
    let data = '';
    let oversized = false;
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      if (oversized) return;
      if (data.length + chunk.length > MAX_STDIN) {
        oversized = true;
        data = '';
        return;
      }
      data += chunk;
    });
    process.stdin.on('end', () => {
      if (oversized || !data.trim()) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    process.stdin.on('error', () => resolve({}));
  });
}

/** Collect every file path an Edit/Write/MultiEdit call touched. */
function editedFiles(input) {
  const ti = (input && input.tool_input) || {};
  const out = [];
  if (ti.file_path) out.push(String(ti.file_path));
  if (Array.isArray(ti.edits)) {
    for (const e of ti.edits) if (e && e.file_path) out.push(String(e.file_path));
  }
  return [...new Set(out)];
}

/** Walk up from `dir` until a directory containing `marker` is found. */
function findUp(dir, marker, maxDepth = 20) {
  const path = require('path');
  const fs = require('fs');
  let cur = path.resolve(dir);
  const root = path.parse(cur).root;
  for (let i = 0; i < maxDepth && cur !== root; i++) {
    if (fs.existsSync(path.join(cur, marker))) return cur;
    cur = path.dirname(cur);
  }
  return null;
}

function projectDir() {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

module.exports = { readStdinJson, editedFiles, findUp, projectDir };

/**
 * Surface text to Claude from a hook that must not block.
 * Claude Code ignores stderr on exit 0, so we return JSON additionalContext.
 */
function emitContext(hookEventName, lines) {
  if (!lines || !lines.length) return;
  const payload = {
    hookSpecificOutput: { hookEventName, additionalContext: lines.join('\n') },
  };
  process.stdout.write(JSON.stringify(payload));
}

module.exports.emitContext = emitContext;
