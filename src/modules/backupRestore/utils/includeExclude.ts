import { P, match } from "ts-pattern";

export type IncludeExclude<Choices extends string> = Readonly<
  | { include?: ReadonlyArray<Choices>; exclude?: undefined }
  | { exclude?: ReadonlyArray<Choices>; include?: undefined }
>;

export const includeExcludePredicate =
  (params: IncludeExclude<string>) => (entity: Readonly<{ name: string }>) =>
    match(params)
      .with({ include: P.nonNullable }, ({ include }) => include.includes(entity.name))
      .with({ exclude: P.nonNullable }, ({ exclude }) => !exclude.includes(entity.name))
      .otherwise(() => true);

export const resolveIncludeExcludeCliParams = <Choices extends string>(params: {
  include?: ReadonlyArray<Choices>;
  exclude?: ReadonlyArray<Choices>;
}): IncludeExclude<Choices> =>
  match(params)
    .returnType<IncludeExclude<Choices>>()
    .with({ include: P.nonNullable }, ({ include }) => ({ ...params, include, exclude: undefined }))
    .with({ exclude: P.nonNullable }, ({ exclude }) => ({ ...params, exclude, include: undefined }))
    .otherwise(() => ({ ...params, include: undefined, exclude: undefined }));
