## Decisions

- `spec` lives next to the optional legacy `data`; reads use `productSpecOf(doc)` so no migration is needed, and `update` clears `data`.
- Legacy conversion maps by topic label (numbering stripped) and keeps every answered topic, with its ancestors' headings, in notes — nothing is lost even for unknown templates.
- Entities have stable ids so a later change can let other apps link to a single feature or persona (the knowledge ref already reserves `anchor`).
