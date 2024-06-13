import { ImportContext } from "../../entityDefinition.js";

type Params = Readonly<{
  newId: string | undefined;
  oldId: string;
  entityName: string;
}>;

export const createReference = (params: Params) =>
  params.newId ? { id: params.newId } : { external_id: `non-existent-${params.entityName}-${params.oldId}` };

/**
 * extracts specified `keys` from `ImportContext`, simplifies `string:object`
 * pairs to `string:(string)selfId`, then merges all pairs into a single `Map<string, string>`
 *
 * @param context original `ImportContext` object or its partial representation
 * @param keys keys to extract from `ImportContext` (defaults to all)
 * @returns map of all `oldId:newId` pairs for top level entities
 */
export const simplifyContext = <K extends keyof ImportContext = keyof ImportContext>(
  context: Partial<ImportContext>,
  keys?: K[],
) => {
  const getSimplifiedMap = (map: ReadonlyMap<string, string | { selfId: string }>) =>
    new Map([...map].map(([k, v]) => [k, typeof v === "string" ? v : v.selfId]));

  const keysToExtract = keys ?? Object.keys(context) as K[];

  return new Map(
    Object.entries(context)
      .filter(([k]) => keysToExtract.includes(k as K))
      .flatMap(([, v]) => [...getSimplifiedMap(v)]),
  );
};

export const transformReferences = <T extends object>(
  object: T,
  flatContext: Map<string, string>,
): T => {
  const traverseAndReplace = (value: unknown): unknown => {
    if (typeof value === "string") {
      return flatContext.get(value) ?? value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => traverseAndReplace(item));
    }

    if (value !== null && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, value]) => [key, traverseAndReplace(value)]));
    }

    return value;
  };

  return traverseAndReplace(object) as T;
};
