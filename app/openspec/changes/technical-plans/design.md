## Decisions

- Conversion is explicit (banner + `convertLegacyTasks`) rather than an automatic migration: Convex has no post-deploy hook, and an explicit action shows the user what happens.
- Until converted, `technicalTasks` remains a knowledge app key (legacy in the registry, not a workspace app) so stored links and refs keep validating and exporting.
- `technicalPlanFromLegacyTask`: summary → goal; bug report, impact, reproduction steps → context; acceptance criteria kept; files to create/modify → steps; status mapped.
