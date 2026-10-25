# Coding style (all languages)

Adapted from ECC `rules/common/coding-style.md`.

## Immutability by default
Return new objects instead of mutating inputs. Exception, documented in `three-r3f.md`: per-frame mutation of Three.js objects through refs inside `useFrame` is required for performance.

## Principles
- KISS: simplest thing that works. YAGNI: no speculative abstraction. DRY: extract when repetition is real.
- Many small files over few large ones. 200-400 lines typical, 800 soft ceiling. Organize by feature (`scene/`, `engine/`, `voice/`), not by type.
- Functions under ~50 lines, nesting under 4 levels, early returns.
- Named constants for thresholds (`PLACEMENT_WARNING_THRESHOLD = 0.5`), never magic numbers in logic.

## Errors and validation
- Handle errors explicitly at boundaries; never swallow silently.
- Validate external input at system boundaries (API bodies with Pydantic, browser inputs with Zod).
- UI-facing errors are human sentences; server logs carry the detail.

## Naming
- Descriptive names that remove the need for a comment. Booleans read as claims (`isResolved`, `hasWarning`).
- Domain vocabulary is fixed: `fault`, `row` (breadboard row, 1-based in UI, 0-based in arrays), `reading` (volts), `belief` (posterior over faults), `placement` (posterior over rows), `instruction` (row the user is told to probe).

## Checklist before marking work complete
- [ ] Readable, well-named, small functions and files
- [ ] Errors handled, inputs validated
- [ ] No console.log / print left in production paths
- [ ] Tests exist for logic (see `testing.md`)
