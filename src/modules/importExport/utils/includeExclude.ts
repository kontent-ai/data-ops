export type IncludeExclude<Choices extends string> =
  | { include: ReadonlyArray<Choices> }
  | { exclude?: ReadonlyArray<Choices> }; // Exclude is optional because it's possible to use the type without

export const includeExcludePredicate = (params: IncludeExclude<string>) => (entity: Readonly<{ name: string }>) =>
  "include" in params ? params.include.includes(entity.name) : !params.exclude?.includes(entity.name);
