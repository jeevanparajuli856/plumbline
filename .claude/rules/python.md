---
paths:
  - "**/*.py"
  - "**/*.pyi"
  - "**/pyproject.toml"
---
# Python (engine and API)

Condensed from ECC `rules/python/*`. Extends `coding-style.md`.

- Python 3.13 managed by `uv`. `uv run --project engine <cmd>`; never `pip install` globally.
- Formatting and lint: `ruff format`, `ruff check` (hooks run both). Type hints on every public signature; `pyright` basic mode clean on `plumbline/`.
- Immutable data: `@dataclass(frozen=True)` for Fault, Reading, Instruction; `NamedTuple` for small tuples. NumPy arrays are the one mutable hot path; never mutate caller-owned arrays.
- Randomness only through an injected `numpy.random.Generator` seeded by the caller.
- Numerics: log-space for belief updates when products get small; renormalize; assert `np.isfinite`. Keep `sigma`, confusion probabilities and thresholds as named module constants or a `Config` dataclass, never literals in formulas.
- Tests with pytest; `@pytest.mark.slow` for full experiment sweeps; fixtures record reference outputs into `engine/fixtures/parity/` for the TS port.
- FastAPI: Pydantic v2 models for every request/response; one router per concern (`sessions`, `readings`, `experiments`); no global mutable state beyond an in-memory session dict keyed by UUID; CORS allowlist from settings.
- Keep the research scripts (`experiment.py`, `stability.py`, `mkfigs.py`) runnable as-is. The package wraps them; it does not rewrite them.
