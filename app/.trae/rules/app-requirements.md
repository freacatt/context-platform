---
alwaysApply: false
applyMode: intelligence
description: Mandatory structure and UX requirements shared by all workspace Apps.
globs:
  - "app/src/pages/**"
  - "app/src/components/**"
---
# App Requirements (All Workspace Apps)

Every workspace App MUST satisfy these requirements. Per-app details are in `app/apps/*.md`.

## MUST — Requirements Table

| Feature | Requirement |
|---------|-------------|
| Dashboard | Dedicated card on Workspace Dashboard |
| Creation | Modal-based with title input |
| Deletion | MUST require typing object name to confirm |
| Renaming | Supported |
| Search | Local filter/search on App page |
| Global Context | Registered as distinct category, selectable in Global Context |
| Documentation | Update `.trae/rules/app/apps/` when logic or data structure changes |
| Category | Declared in app rule file frontmatter; used for Dashboard grouping |
| Color | Canonical Tailwind class in rule file `primaryColorClass`; used on dashboard cards |

## MUST — Dashboard Integration
- Every App has a dedicated card on the main Workspace Dashboard.
- Cards grouped by `category` from the app's rule file frontmatter.
- Cards use `primaryColorClass` for visual identity.

## MUST — CRUD Operations
- **Create**: Button opens modal form.
- **Delete**: User MUST type the object name to confirm deletion.
- **Rename**: Supported for all objects.

## MUST — Global Context
- App domain objects registered as a distinct category in Global Context.
- Objects selectable and usable for AI context and cross-referencing.
