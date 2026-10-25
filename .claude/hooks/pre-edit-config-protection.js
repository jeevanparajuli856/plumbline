#!/usr/bin/env node
'use strict';
/**
 * PreToolUse (Edit|Write|MultiEdit): block weakening linter/formatter config.
 * Agents sometimes edit eslint/prettier/ruff config or ignore files to make a
 * check pass instead of fixing the code. Creating a config for the first time
 * is allowed; modifying an existing one is blocked (exit 2) with guidance.
 * Set PLUMBLINE_ALLOW_CONFIG_EDIT=1 to bypass for a deliberate change.
 */
const fs = require('fs');
const path = require('path');
const { readStdinJson, editedFiles } = require('./lib/hook-input');

const PROTECTED = new Set([
  '.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json',
  'eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts',
  '.prettierrc', '.prettierrc.json', '.prettierrc.js', '.prettierrc.cjs', 'prettier.config.js', 'prettier.config.mjs',
  'biome.json', 'biome.jsonc', 'ruff.toml', '.ruff.toml',
  '.eslintignore', '.prettierignore',
]);

(async () => {
  if (process.env.PLUMBLINE_ALLOW_CONFIG_EDIT === '1') process.exit(0);
  const input = await readStdinJson();
  for (const f of editedFiles(input)) {
    const abs = path.resolve(f);
    if (PROTECTED.has(path.basename(abs)) && fs.existsSync(abs)) {
      process.stderr.write(
        `[hook] BLOCKED: editing ${path.basename(abs)} weakens the quality gate. ` +
          'Fix the reported code instead. If the config change is genuinely required, ' +
          'ask the user and rerun with PLUMBLINE_ALLOW_CONFIG_EDIT=1.\n',
      );
      process.exit(2);
    }
  }
  process.exit(0);
})();
