// Callbacks passed to page.evaluate and addInitScript run in the browser. tsconfig.node.json
// (shared with vite.config.ts) has no DOM lib, so the e2e files bring it in here.
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
