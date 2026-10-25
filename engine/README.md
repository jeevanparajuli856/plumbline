# engine/

Python package `plumbline` (inference engine) and `plumbline_api` (FastAPI). Created by `/bootstrap`.

Drop the teammate's `handsight` files here before or after bootstrap:

```
engine/plumbline/circuit.py      <- handsight/circuit.py
engine/plumbline/engine.py       <- handsight/engine.py
engine/plumbline/experiments/    <- experiment.py, stability.py, mkfigs.py
```

Then run `uv run --project engine pytest -q` and `/demo-worked-example`. Contract and layout: `docs/ARCHITECTURE.md`, skill `plumbline-engine`.
