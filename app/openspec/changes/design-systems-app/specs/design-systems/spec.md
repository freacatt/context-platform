## ADDED Requirements

### Requirement: Design systems with tokens and components
The workspace owner SHALL create any number of design systems, each with foundations, color tokens with light and dark values, a type scale, spacing/radius/shadow/motion/breakpoint scales and documented components. New systems MUST start with a default token set.

#### Scenario: Create
- **WHEN** the user creates "Acme UI"
- **THEN** it has default colors, type, spacing, radius, shadow, motion and breakpoint tokens and no components

### Requirement: Exports
A design system SHALL export as Markdown (token tables, components, guidelines), as W3C design tokens JSON, and as CSS custom properties with dark values under `.dark`.

#### Scenario: Tokens JSON
- **WHEN** the user exports design tokens of a system with color "Primary Brand" (#111 / #eee)
- **THEN** the JSON has `color.primary-brand` = #111 and `color-dark.primary-brand` = #eee
