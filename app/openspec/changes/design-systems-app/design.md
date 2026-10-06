## Decisions

- Stored as `{ title, spec }` with a pure normalizer (`normalizeDesignSystem`) applied on every write and read — the pattern every new app follows (`specDocFunctions`).
- New systems start with an editable default token set, so exports are useful immediately.
- Tokens export follows the W3C Design Tokens Community Group format; dark colors go to a `color-dark` group and to `.dark { … }` in CSS.
- UI/UX keeps `theme_specification`/`base_components` as optional legacy fields (no schema migration); the editor offers the move while they hold anything (`hasLegacyDesign`).
- Deleting a design system clears `designSystemId` on architectures using it (`onRemove` hook of the factory).

## Risks / Trade-offs

- [Pages referencing removed components] → names fall back to the component id.
