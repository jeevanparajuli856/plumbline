# Architecture decision records

Truehand records each architecture decision as a short MADR-style record in this folder.
Each record states its context, the decision with concrete choices, the consequences, and the
alternatives that were considered. A record changes only by a new record that supersedes it.

Source for the decisions: the approved plan `/Users/jeevaparajuli/.claude/plans/magical-brewing-jellyfish.md`
(Decisions table, Architecture v1, Reconciliations, Appendices A and B), dated 2026-10-25.

| Number | Title | Status | Date |
|---|---|---|---|
| [0001](0001-stack.md) | Stack: Vite + React 19 + TS strict + Tailwind v4 + R3F/drei + Zustand + Zod; Python 3.13/uv/NumPy/FastAPI | accepted | 2026-10-25 |
| [0002](0002-engine-rebuild-test-first.md) | Rebuild the engine test-first from the six-line math; `handsight` becomes the parity reference when it arrives | accepted | 2026-10-25 |
| [0003](0003-domain-agnostic-core-instrument-models.md) | Domain-agnostic core + plug-in instrument models; domain 1 circuit (exact), domain 2 kitchen probe thermometer (simulated, labeled) | accepted | 2026-10-25 |
| [0004](0004-honesty-contract.md) | Honesty contract: every displayed number traces to a command or DOI; readiness panel shows build items done and user validation pending; simulated means labeled | accepted | 2026-10-25 |
| [0005](0005-hosting-render.md) | Hosting on Render: static site (web) + web service (FastAPI); `render.yaml` blueprint in repo | accepted | 2026-10-25 |
| [0006](0006-ts-port-parity-gated.md) | TS port gated by parity (<1e-6) drives replay/offline; API drives simulate/live until then | accepted | 2026-10-25 |
| [0007](0007-one-site-scroll-landing-light-instrument.md) | One site: scroll-driven landing -> `/sim`; shared R3F scene; "Light instrument" visual direction | accepted | 2026-10-25 |
| [0008](0008-accessibility-architecture.md) | Accessibility architecture: DOM/aria-live twin for every 3D state; keyboard + voice drive everything; Web Speech API with typed fallback | accepted | 2026-10-25 |
| [0009](0009-pwa-then-capacitor.md) | PWA now, Capacitor wrapper for iOS at finals; no native rewrite | accepted | 2026-10-25 |
| [0010](0010-baselines-and-static-llm-transcript.md) | Baselines: published entropy-exact method live in-engine; LLM comparison as a static, dated, recorded transcript (no API keys in app) | accepted | 2026-10-25 |
| [0011](0011-worktree-lanes-and-verify-gate.md) | Worktree lanes with disjoint write surfaces; `/verify` gate; conventional commits | accepted | 2026-10-25 |
| [0012](0012-grounded-explainer-llm.md) | Grounded language-model explainer (Vertex AI or Anthropic, server-side, flagged off); never inside the inference | accepted | 2026-10-25 |
| [0013](0013-brand-truehand.md) | The product is named Truehand; the mark is a braille cell that is also a breadboard; internal identifiers keep truehand | accepted | 2026-10-25 |

Numbers in these records follow the labeling rule in ADR-0004. Figures from the brief are called
"the brief's expectation, not our run". Figures from the plan's scratch computations are called
"scratch reconstruction on 2026-10-25, to be re-run inside `engine/`".
