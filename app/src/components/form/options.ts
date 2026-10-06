/** Select options from values, labelled from a map or by capitalizing ("in_progress" → "In progress"). */
export const optionsOf = <T extends string>(values: readonly T[], labels?: Partial<Record<T, string>>) =>
  values.map((value) => ({ value, label: labels?.[value] ?? value.charAt(0).toUpperCase() + value.slice(1).replace(/[-_]/g, ' ') }));
