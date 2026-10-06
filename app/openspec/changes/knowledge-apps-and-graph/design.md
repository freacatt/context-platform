## Decisions

- All four apps use the spec-document pattern (`shared/specs` + `specDocFunctions` + `SpecEditorShell`), so each is a model file, a one-line Convex module and two screens.
- `decisions.createFromPyramid` copies the final cell (question → context, conclusion → decision, dissent → consequences) and links the decision `derived-from` the pyramid.
- The graph uses React Flow with a deterministic column-per-app layout (no physics), so it is stable between visits and cheap to render.
