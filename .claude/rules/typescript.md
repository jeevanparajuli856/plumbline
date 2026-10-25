---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.mts"
---
# TypeScript

Condensed from ECC `rules/typescript/*`. Extends `coding-style.md`.

- `strict: true`. No `any` in app code; `unknown` at boundaries, then narrow. Generics when a type depends on the caller.
- Explicit parameter and return types on exported functions and shared utilities; let locals infer.
- `interface` for object shapes, `type` for unions/intersections/mapped types. String-literal unions over `enum`.
- Props: named `interface XProps`; typed callbacks; no `React.FC`.
- Immutable updates with spread; `Readonly<T>` / `readonly` arrays on inputs to engine functions.
- Errors: `async/await` + `try/catch`, narrow `unknown` with `instanceof Error`.
- Validation at boundaries with Zod; infer types from schemas (`z.infer`).
- Numbers: the engine port uses plain `number[]` / `Float64Array`, never object-per-cell arrays in hot loops. Keep math in pure functions under `src/engine/`, zero React imports.
- No `console.log` in production paths (hook warns). Use the tiny `log` util in `src/lib/log.ts` once it exists.
- Path alias `@/` -> `apps/web/src`. ESM only.
