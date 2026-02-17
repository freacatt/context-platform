---
alwaysApply: false
description: Defines how 3D assets must be created and integrated into the app: file locations and naming, modern visual style guidelines, geometry and material requirements, lighting setup, viewport behavior, fallbacks when models are missing, and a QA checklist for consistency.
---
# 3D Objects — Design & Implementation Rules

## Purpose
Define consistent standards for 3D assets used in dashboard cards and other UI surfaces.

## Directory Structure
- Store authored assets in: `public/3d/`
- Filenames use `snake_case` and map 1:1 with app identifiers.
- Example:
  - `public/3d/ai_assistant.glb`
  - `public/3d/pyramid_solver.glb`

## Visual Style
- Corners: Prefer high-radius chamfer/rounding on visible primitives (e.g., rounded boxes).
- Materials: Solid, modern materials (Physical/Standard) with tuned metallic/roughness and optional clearcoat.
- Modern Look: Clean silhouettes with mid-poly detail; avoid busy textures. Accents use subtle emissive where appropriate.

## Technical
- Geometry:
  - Use rounded primitives where possible (e.g., `RoundedBoxGeometry`).
  - Mid-poly is acceptable for better forms; prioritize silhouette and readability in a small viewport.
- Materials:
  - Use `MeshPhysicalMaterial` or `MeshStandardMaterial`.
  - Suggested baseline: `metalness: 0.2–0.5`, `roughness: 0.25–0.6`, optional `clearcoat: 0–0.3`.
  - Accents may use a small `emissive` for modern UI flair.
- Lighting:
  - Use `HemisphereLight` plus one or two `DirectionalLight`s for soft, contemporary shading.
  - Keep lighting neutral; avoid harsh shadows that obscure silhouettes.

## Integration
- Card viewport is square; models must be centered and uniformly scaled to fit.
- If a model is missing, render a simple procedural shape as a fallback (no UI breakage).
- Procedural presets exist for rapid prototyping: `lowpoly-bot`, `pyramid`, `nodes-graph`, `workshop-tools`, `picture-frame`, `old-book`, `airplane`, `technician`. Replace with authored assets in `public/3d/` as they become available.

## QA Checklist
- Rounded edges are visible at normal zoom.
- No z-fighting or clipping in the square viewport.
- Materials read as solid and modern under default lighting.
