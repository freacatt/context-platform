---
alwaysApply: false
applyMode: intelligence
description: Rules for the Pyramid Solver app.
globs:
  - "app/src/**/pyramid*"
  - "app/src/**/Pyramid*"
category: "Problem Solving, Thinking and Planning"
primaryColorClass: "bg-indigo-600"
---
# Pyramid Solver Rules

## CRITICAL
- Every pyramid MUST have exactly 64 blocks (8x8 grid) on creation.
- Deleting a pyramid permanently removes it from storage.

## Data Model
- Type: `Pyramid` in `app/src/types/pyramid.ts`
- Service: `app/src/services/pyramidService.ts`

## Core Logic
- `createPyramid`: Initializes 8x8 grid of 64 blocks, type 'question'.
- `duplicatePyramid`: Deep copies pyramid, appends "(Copy)" to title, resets ID and timestamps.
- `getUserPyramids`: Returns sorted by `lastModified` descending.
- `subscribeToPyramid`: Real-time updates via storage adapter subscription.
