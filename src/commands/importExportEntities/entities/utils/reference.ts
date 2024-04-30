import { notNullOrUndefined } from "../../../../utils/typeguards.js";
import { Transformable } from "../../../../utils/types.js";
import { ImportContext, SimplifyContext } from "../../entityDefinition.js";

type Params = Readonly<{
  newId: string | undefined;
  oldId: string;
  entityName: string;
}>;

export const createReference = (params: Params) =>
  params.newId ? { id: params.newId } : { external_id: `non-existent-${params.entityName}-${params.oldId}` };

/**
 * extracts top level values from import context. `string:string` pairs are left unchanged,
 * `string:object` are simplified, with `selfId` string replacing the object as value.
 *
 * @param context `ImportContext` object
 * @param keys specifies which root keys to extract from the context, defaults to all keys
 * @returns flattened map of string:string pairs
 */
export const simplifyContext = <T extends keyof ImportContext = keyof ImportContext>(
  context: Partial<ImportContext>,
  keys?: T[],
) => {
  const getSimplifiedMap = (map: ReadonlyMap<string, any>) => new Map([...map].map(([k, v]) => [k, v.selfId ?? v]));

  const keysToExtract = keys ?? Object.keys(context) as T[];
  const simpleContext = Object.fromEntries(
    Object.entries(context)
      .filter(([k]) => keysToExtract.includes(k as T))
      .map(([k, v]) => [k, getSimplifiedMap(v)]),
  );

  return simpleContext as unknown as SimplifyContext<T>;
};

export const transformReferences = <T extends object>(
  object: Transformable<T>,
  flatContext: SimplifyContext<any>, // TODO: improve this type
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
        if (!notNullOrUndefined(value)) {
          return value;
        }
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
