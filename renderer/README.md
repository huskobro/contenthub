# Renderer

This directory contains the rendering layer for ContentHub.

## Purpose

The renderer is kept separate from the backend (`backend/`) intentionally. Rendering is a distinct concern — it transforms structured content data into video/image artifacts using Remotion. Mixing it into the FastAPI application would create a monolithic boundary that is hard to isolate, test, or replace.

## Why No Remotion Code Yet

Remotion requires composition components, a render entry point, and a bundled composition registry. These depend on the Template system and Style Blueprint system, which are not yet built. Introducing Remotion before those contracts are stable would create premature coupling.

## What Will Live Here

- `src/compositions/` — Remotion composition components, one per content module type
- `src/shared/` — shared layout primitives, safe composition mapping, type contracts
- Safe composition mapping: AI-generated content is never allowed to write uncontrolled render code. A deterministic mapping layer here translates structured data to Remotion props.
- Final render entrypoints: called by the job engine once content is approved
- Preview/draft composition surfaces: lightweight single-frame or short-segment outputs for wizard previews and style selection

## What Is Not Here

- No Remotion package yet
- No composition components
- No preview pipeline
- No job engine integration
- No connection to backend or frontend
