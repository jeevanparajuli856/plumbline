#!/usr/bin/env node
'use strict';
/** statusLine: model | branch (lane) | context used | cwd basename */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { readStdinJson } = require('./lib/hook-input');

(async () => {
  const s = await readStdinJson();
  const cwd = (s.workspace && s.workspace.current_dir) || s.cwd || process.cwd();
  let branch = '';
  try {
    branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 }).trim();
  } catch {}
  let lane = '';
  try {
    const f = path.join(cwd, '.lane');
    if (fs.existsSync(f)) lane = fs.readFileSync(f, 'utf8').trim();
  } catch {}
  const model = (s.model && (s.model.display_name || s.model.id)) || 'claude';
  const cw = s.context_window || {};
  let ctx = '';
  const used = cw.used_percentage ?? (cw.current_usage && cw.context_window_size
    ? Math.round(((cw.current_usage.input_tokens || 0) + (cw.current_usage.cache_creation_input_tokens || 0) + (cw.current_usage.cache_read_input_tokens || 0)) / cw.context_window_size * 100)
    : null);
  if (used != null) ctx = ` | ctx ${used}%`;
  const parts = [`${model}`, branch ? `${branch}${lane ? ` (${lane})` : ''}` : path.basename(cwd)];
  process.stdout.write(`truehand ⟂ ${parts.join(' | ')}${ctx}`);
})();
