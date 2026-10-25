# ADR-0012: A grounded language-model explainer, never inside the inference

## Status

Accepted, 2026-10-25. Scheduled for Sprint 2 (Nov 2 to 8). Feature-flagged; the product works
without it.

## Context

The engine is probabilistic AI: a Bayesian update over fault hypotheses and probe placement, an
expected-information-gain planner, and a refusal rule. Every number it shows traces to a command.
The Nexus dossier says judges mark down "trivial AI wrappers" and mark up hard tech with a baseline.
CircuitSense (arXiv 2509.22339) reports frontier models detect circuit components near perfectly and
then derive circuit behaviour at 5 to 19 percent, so a language model must never choose probes,
compute voltages or name faults here.

The three studies behind the product (CHI 2026, ASSETS 2024, arXiv 2602.18623) show blind users
want to interrogate a system: "why this step", "what does this part do", "how sure are you". The
engine knows the answers as numbers and catalog text; a language model can turn them into
sentences and answer follow-up questions in the user's words.

The user has Vertex AI available on Google Cloud. The Anthropic API is the alternative.

## Decision

1. Add an optional endpoint `POST /v1/sessions/{id}/explain` with body `{question: str}` (bounded
   length). The server builds a context from the session only: current instruction and gain per
   site, belief top-k with labels and descriptions, placement posterior and warning, the reading
   log, the resolution status, and the unresolved classes. Nothing else is in the prompt.
2. The model is instructed to explain and to decline anything outside that context. The response
   is validated: it may not contain a numeric probability or voltage that is not present in the
   context (a regex check against the context's numbers, with a 1e-3 tolerance), or the server
   replaces the answer with the engine's own phrase and logs the event.
3. Provider adapter in `engine/plumbline_api/explain/`: `Provider` protocol with `VertexProvider`
   (Gemini or Claude on Vertex AI, authenticated by the service account on the server) and
   `AnthropicProvider`. Chosen by `PLUMBLINE_EXPLAIN_PROVIDER` (`off` by default). Credentials stay
   on the server; the browser never sees a key.
4. UI: an "Ask" field in the simulator and a spoken command "explain" in the voice loop. Every
   answer carries the label "Explanation by a language model. Numbers come from the engine." in
   the DOM and in speech. The feature is hidden when the provider is `off`.
5. The explainer is never on the critical path of the demo. Replay, simulate and live work with
   it off, and the recorded video does not depend on it.

## Consequences

- Positive: a real accessibility feature grounded in the study evidence, and a clear story for
  judges about where language models belong and where they do not.
- Positive: provider choice is a one-line setting; Vertex AI keeps the bill and the data on the
  team's Google Cloud account.
- Negative: a network dependency and a new failure mode; mitigated by the flag and the fallback to
  engine phrases.
- Negative: prompt and validation code need tests like any other logic (test-first, fixtures of
  session states, no live calls in CI).
- Revisit: if the explainer ever needs to look at a photo of the board, that is a new decision,
  because perception is a separate claim.

## Alternatives considered

- A language model in the inference loop: rejected, CircuitSense numbers and the honesty rule.
- A fully scripted explainer with templates: kept as the fallback; it cannot answer free questions.
- Running the model in the browser: rejected, keys in the client and no Vertex AI access.
