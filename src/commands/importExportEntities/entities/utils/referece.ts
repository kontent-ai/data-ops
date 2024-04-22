import { Transformable } from "../../../../utils/types.js";
import { ExtractRootEntityMaps, ImportContext } from "../../entityDefinition.js";

type Params = Readonly<{
  newId: string | undefined;
  oldId: string;
  entityName: string;
}>;

export const createReference = (params: Params) =>
  params.newId ? { id: params.newId } : { external_id: `non-existent-${params.entityName}-${params.oldId}` };

export const simplifyContext = <T extends keyof ImportContext = keyof ImportContext>(
  context: ImportContext,
  keys?: T[],
) => {
  const getSimplifiedMap = (map: ReadonlyMap<string, any>) => new Map([...map].map(([k, v]) => [k, v.selfId ?? v]));

  const keysToExtract = keys ?? Object.keys(context) as T[];
  const simpleContext = Object.fromEntries(
    Object.entries(context)
      .filter(([k, _]) => keysToExtract.includes(k as T))
      .map(([k, v]) => [k, getSimplifiedMap(v)]),
  );

  return simpleContext as unknown as ExtractRootEntityMaps<T>;
};

export const transformReferences = <T extends object>(
  object: Transformable<T>,
  flatContext: ExtractRootEntityMaps<any>, // TODO: improve this type
): T => {
  /**
   * this merges all simplified context maps into a single map, which is subsequently used
   * for lookup of transformed values. if no match is found, original value is returned.
   *
   * if the value is an `object`, transforms it recursively.
   */
  const flatContextMap = new Map<string, string>(Object.values(flatContext).flatMap(c => [...c]));

  const traverseAndReplace = (value: Transformable<T>): Transformable<any> => {
    switch (typeof value) {
      case "string":
        return flatContextMap.get(value) ?? value;
      case "object":
        if (Array.isArray(value)) {
          return value.map((item) => traverseAndReplace(item));
        } else {
          return Object.keys(value).reduce<Transformable<any>>((acc, key) => {
            acc[key] = traverseAndReplace(value[key]);
            return acc;
          }, {});
        }
      default:
        return value;
    }
  };

  return traverseAndReplace(object);
};
