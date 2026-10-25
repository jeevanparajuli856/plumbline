# Security (right-sized for a local demo app)

- No secrets in source. `.env` files are gitignored and never read by Claude (`permissions.deny`).
- FastAPI: validate every body with Pydantic models; bound list sizes; reject NaN/inf readings; CORS allowlist to the Vite dev origin and the deployed origin only.
- Web: no `dangerouslySetInnerHTML`; voice transcripts are data, never evaluated.
- Dependencies: prefer well-known packages; pin major versions; run `pnpm audit` / `uv pip audit` before the finals freeze.
- Anything beyond this (auth, payments, PII) is out of scope by rule `00-plumbline.md`. If it appears, stop and use `security-reviewer`.
