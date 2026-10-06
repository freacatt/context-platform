## 1. Design systems

- [x] 1.1 `shared/specs/designSystem.ts`: model, defaults, normalizer, Markdown, tokens JSON, CSS, legacy conversion + tests
- [x] 1.2 `specDocFunctions` factory; `convex/designSystems.ts` (unlinks architectures on delete)
- [x] 1.3 List page and editor (foundations, colors, typography, scales, components; three exports)

## 2. UI/UX

- [x] 2.1 Schema: `designSystemId`, optional legacy theme/components
- [x] 2.2 `setDesignSystem`, `extractDesignSystem` + tests
- [x] 2.3 Canvas without theme/component nodes; design system picker; legacy move button; page modal uses design system components
- [x] 2.4 Derived relation UI/UX → design system; backups re-link it
