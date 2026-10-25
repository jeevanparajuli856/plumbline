#!/usr/bin/env node
'use strict';
/**
 * PostToolUse (Edit|Write|MultiEdit): design-quality nudge for UI files.
 * Adapted from ECC's design-quality-check. Heuristic only, never blocks.
 * Fires for .tsx/.jsx/.css/.html under the web app, skipping 3D scene math.
 */
const fs = require('fs');
const path = require('path');
const { readStdinJson, editedFiles, emitContext } = require('./lib/hook-input');

const UI_EXT = /\.(tsx|jsx|css|html)$/i;
const SKIP = /(^|\/)(node_modules|dist|\.claude|e2e|__tests__)\//;
const GENERIC = [
  { re: /\bget started\b/i, label: '"Get Started" CTA copy' },
  { re: /\blearn more\b/i, label: '"Learn more" CTA copy' },
  { re: /\bgrid-cols-(3|4)\b/, label: 'uniform multi-card grid' },
  { re: /\bbg-gradient-to-[trbl]\b/, label: 'stock gradient utility' },
  { re: /\bfont-(sans|inter)\b/i, label: 'default font utility' },
  { re: /\bshadow-(md|lg)\b.*\brounded-(lg|xl)\b/, label: 'default card recipe (shadow + rounded)' },
  { re: /#(fff|ffffff|000|000000)\b/i, label: 'pure white/black instead of the palette token' },
];

(async () => {
  const input = await readStdinJson();
  const files = editedFiles(input).filter((f) => UI_EXT.test(f) && !SKIP.test(f));
  if (!files.length) process.exit(0);
  const hits = [];
  for (const f of files) {
    let src = '';
    try {
      src = fs.readFileSync(path.resolve(f), 'utf8');
    } catch {
      continue;
    }
    for (const g of GENERIC) if (g.re.test(src)) hits.push(`${path.basename(f)}: ${g.label}`);
  }
  if (!hits.length) process.exit(0);
  emitContext('PostToolUse', [
    '[hook] DESIGN CHECK - generic-template signals detected:',
    ...hits.map((h) => `  - ${h}`),
    '  Truehand UI must read as a precision instrument, not a SaaS template.',
    '  Use the design tokens in apps/web/src/styles/tokens.css; see .claude/rules/web-design-quality.md.',
  ]);
  process.exit(0);
})();
