#!/usr/bin/env node
'use strict';
/**
 * Stop: macOS desktop notification with the first line of Claude's last message.
 * Silent anywhere else. Never blocks.
 */
const { spawnSync } = require('child_process');
const { readStdinJson } = require('./lib/hook-input');

(async () => {
  const input = await readStdinJson();
  if (input.stop_hook_active || process.platform !== 'darwin') process.exit(0);
  const msg = String(input.last_assistant_message || '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0) || 'Done';
  const body = msg.slice(0, 110).replace(/\\/g, '').replace(/"/g, '“');
  const lane = process.env.TRUEHAND_LANE ? ` [${process.env.TRUEHAND_LANE}]` : '';
  spawnSync('osascript', ['-e', `display notification "${body}" with title "Truehand${lane}" sound name "Glass"`], {
    stdio: 'ignore',
    timeout: 4000,
  });
  process.exit(0);
})();
