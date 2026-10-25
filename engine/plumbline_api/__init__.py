"""Temporary alias for the renamed API package (ADR-0013).

The Render service `plumbline-api` was created in the dashboard with the start command
`uvicorn plumbline_api.main:app`, which no repo file controls. This alias keeps that command
working. Delete this package once the dashboard start command reads `truehand_api.main:app`.
"""
