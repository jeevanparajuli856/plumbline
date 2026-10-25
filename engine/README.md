# engine/

Python package `truehand` (inference engine) and `truehand_api` (FastAPI). Created by `/bootstrap`.

Drop the teammate's `handsight` files here before or after bootstrap:

```
engine/truehand/circuit.py      <- handsight/circuit.py
engine/truehand/engine.py       <- handsight/engine.py
engine/truehand/experiments/    <- experiment.py, stability.py, mkfigs.py
```

Then run `uv run --project engine pytest -q` and `/demo-worked-example`. Contract and layout: `docs/ARCHITECTURE.md`, skill `truehand-engine`.
