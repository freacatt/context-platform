## Why

UI/UX Architecture mixed a single theme and a component list with screen flows. A design system is a reusable asset of its own: several products or screens can share one, and a workspace may need several.

## What Changes

- New **Design Systems** app: many per workspace, each with foundations (description, principles, voice, iconography, layout, accessibility), color tokens (light/dark), a type scale, spacing/radius/shadow/motion/breakpoint scales, and components (purpose, variants, states, props, do/don't, accessibility). Exports Markdown, W3C design tokens JSON and CSS variables.
- **UI/UX Architecture** loses its theme node and component nodes; it links one design system (`designSystemId`, a derived relation) and pages pick components from it.
- Previous-version theme/components move into a new design system with one click (`extractDesignSystem`); component ids are kept so pages still point at them.

## Capabilities

### New Capabilities
- `design-systems`: The Design Systems app, its tokens, components and exports.
- `ui-ux-design-system`: UI/UX architectures built with a design system, and the move of legacy themes.

### Modified Capabilities

## Impact

`shared/specs/designSystem.ts`, `convex/designSystems.ts`, `convex/lib/specDocs.ts`, `convex/uiUxArchitectures.ts`, schema (`designSystems`, optional legacy UI/UX fields), `src/features/designSystems/`, `src/features/uiUxArchitectures/` (theme/component nodes and modals removed), registry, backups.
