import { zip } from "../../../utils/array.js";
import { PatchOperation } from "../types/diffModel.js";

export type Handler<Entity> = (sourceValue: Entity, targetValue: Entity) => ReadonlyArray<PatchOperation>;
export type ContextfulHandler<Context, Entity> = Readonly<
  { contextfulHandler: (context: Context) => Handler<Entity> }
>;

/**
 * Create patch operations for changed properties inside the object.
 *
 * @param innerHandlers - Provide handlers for each property inside the object.
 */
export const makeObjectHandler = <Entity extends object>(
  innerHandlers: Omit<
    {
      readonly [k in keyof Entity]-?:
        | Handler<Entity[k]>
        | ContextfulHandler<Readonly<{ source: Entity; target: Entity }>, Entity[k]>;
    },
    "id" | "codename" | "external_id"
  >,
): Handler<Entity> =>
(sourceValue, targetValue) => {
  return (Object.entries(innerHandlers) as unknown as [
    keyof Entity & string,
    | Handler<Entity[keyof Entity]>
    | ContextfulHandler<Readonly<{ source: Entity; target: Entity }>, Entity[keyof Entity]>,
  ][])
    .flatMap(([key, someHandler]) => {
      const handler = typeof someHandler === "function"
        ? someHandler
        : someHandler.contextfulHandler({ source: sourceValue, target: targetValue });

      return handler(sourceValue[key], targetValue[key])
        .map(prefixOperationPath(key));
    });
};

/**
 * Replaces the whole object if any of its properties are different. (===) is used for comparison.
 *
 * @param customComparers - use custom comparers for individual properties. The comparers should return true when the properties are the same and false otherwise.
 *
 * @param transformBeforeReplace - provide to transform the source object for the patch operation that will replace the target
 */
export const makeLeafObjectHandler = <Entity extends object>(
  customComparers: Omit<
    { readonly [k in keyof Entity]?: (source: Entity[k], target: Entity[k]) => boolean },
    "id" | "codename" | "external_id"
  >,
  transformBeforeReplace: (v: Entity) => unknown = x => x,
): Handler<Entity> =>
(sourceValue, targetValue) => {
  const shouldReplace = zip(
    Object.keys(sourceValue) as (keyof typeof customComparers)[],
    zip(Object.values(sourceValue), Object.values(targetValue)),
  )
    .some(([key, [source, target]]) =>
      customComparers[key] ? !customComparers[key]?.(source, target) : source !== target
    );

  return shouldReplace
    ? [{ op: "replace", value: transformBeforeReplace(sourceValue), oldValue: targetValue, path: "" }]
    : [];
};

type LazyHandler<T> = Readonly<{ lazyHandler: () => Handler<T> }>;

/**
 * Creates patch operations for entities in an array.
 * It matches the entities by codename and creates "addInto", "remove" and "replace" operations.
 *
 * @param getCodename - function to get the codename from an entity inside the array
 *
 * @param createUpdateOps - update handler for entities inside the array (will only be called on entities with matching codenames)
 *
 * @param transformBeforeAdd - optional transformation of entities before they are added into the "addInto" patch operation
 */
export const makeArrayHandler = <Entity>(
  getCodename: (el: Entity) => string,
  createUpdateOps: Handler<Entity> | LazyHandler<Entity>,
  transformBeforeAdd: (el: Entity) => Entity = x => x,
  pathPrefix: string = "codename:",
): Handler<readonly Entity[]> =>
(sourceValue, targetValue) => {
  // needs to be function due to lazy handling
  const getCreateUpdateOps = () =>
    typeof createUpdateOps === "object" ? createUpdateOps.lazyHandler() : createUpdateOps;

  const sourceCodenamesSet = new Set(sourceValue.map(getCodename));
  const targetWithoutRemoved = targetValue.filter(v => sourceCodenamesSet.has(getCodename(v)));
  const addAndUpdateOps = sourceValue
    .flatMap(v => {
      const sourceCodename = getCodename(v);

      const targetEntity = targetWithoutRemoved.find(t => getCodename(t) === sourceCodename);
      if (targetEntity) {
        return [
          ...getCreateUpdateOps()(v, targetEntity)
            .map(prefixOperationPath(pathPrefix + getCodename(v))),
        ];
      }

      return [
        {
          op: "addInto" as const,
          path: "",
          value: transformBeforeAdd(v),
        },
      ];
    });

  const removeOps = targetValue
    .filter(v => !sourceCodenamesSet.has(getCodename(v)))
    .map(v => ({ op: "remove" as const, path: `/${pathPrefix + getCodename(v)}`, oldValue: v }));

  return [...addAndUpdateOps, ...removeOps];
};

/**
 * Creates move operations for entities in an array.
 * It matches the entities by codename and creates "move" operations and concatenates operations
 * from arrayHandler.
 *
 * Unless the target is ordered same as the source, the algorithm generates one move operation
 * for every element except the first one in each group and assigns them the "after" property
 * to reference the previous element from source
 *
 * @param arrayHandler - handler that creates 'addInto', 'replace' and 'remove' operations.
 *
 * @param getCodename - function to obtain codename from entity (entities are sorted based on codename)
 *
 * @param groupBy - Optional function to obtain property on which the entities should be grouped by
 * (if unspecified all entities are considered to be in the same group).
 * Only entities inside groups are ordered, however, groups are not ordered amongst themselves.
 */
export const makeOrderingHandler = <Entity>(
  arrayHandler: Handler<readonly Entity[]>,
  getCodename: (el: Entity) => string,
  groupBy: (el: Entity) => string = () => "",
): Handler<readonly Entity[]> =>
(sourceValue, targetValue) => {
  const sourceCodenamesSet = new Set(sourceValue.map(getCodename));
  const targetWithoutRemoved = targetValue.filter(v => sourceCodenamesSet.has(getCodename(v)));

  const entityGroups = sourceValue.reduce((prev, entity) => {
    prev.set(groupBy(entity), [...(prev.get(groupBy(entity)) ?? []), getCodename(entity)]);
    return prev;
  }, new Map<string, Array<string>>());

  const isSorted = zip(sourceValue, targetWithoutRemoved).every(([source, target]) =>
    getCodename(source) === getCodename(target)
  );

  const moveOps = isSorted
    ? []
    : Array.from(entityGroups.values()).flatMap(value =>
      value.length <= 1 ? [] : value.slice(1).map((entity, index) => ({
        op: "move" as const,
        path: `/codename:${entity}`,
        after: {
          codename: value[index] as string,
        },
      }))
    );

  return [...arrayHandler(sourceValue, targetValue), ...moveOps];
};

/**
 * Creates a handler for a union of different types discriminated by a single property
 *
 * @param discriminatorKey - defines the property that identifies a particular type in the union (e.g. "type" for content type elements)
 *
 * @param elementHandlers - define handlers for all the union handlers indexed by the apropriate value of the discriminator property
 */
export const makeUnionHandler = <
  DiscriminatorKey extends string,
  Union extends { [key in DiscriminatorKey]: string },
>(
  discriminatorKey: DiscriminatorKey,
  elementHandlers: {
    readonly [Key in Union[DiscriminatorKey]]: Handler<Union & { readonly [key in DiscriminatorKey]: Key }>;
  },
): Handler<Union> =>
(source, target) =>
  source[discriminatorKey] !== target[discriminatorKey]
    ? [{ op: "replace", path: "", value: source, oldValue: target }]
    : elementHandlers[source[discriminatorKey]](source, target);

const prefixOperationPath = (prefix: string) => (op: PatchOperation): PatchOperation => ({
  ...op,
  path: "/" + prefix + op.path,
});

/**
 * Replace the whole value when only one is undefined, do nothing when both are undefined and call the inner handler when neither are undefined.
 */
export const optionalHandler =
  <Entity>(handler: Handler<Entity>): Handler<Entity | undefined> => (sourceVal, targetVal) => {
    if (sourceVal === targetVal && sourceVal === undefined) {
      return [];
    }
    if (sourceVal === undefined || targetVal === undefined) {
      return [{
        op: "replace",
        path: "",
        value: sourceVal,
        oldValue: targetVal,
      }];
    }

    return handler(sourceVal, targetVal);
  };

/**
 * For basic values only. Replace when they are different.
 */
export const baseHandler: Handler<string | boolean | number> = (sourceVal, targetVal) =>
  sourceVal === targetVal ? [] : [{
    op: "replace",
    path: "",
    value: sourceVal,
    oldValue: targetVal,
  }];

/**
 * Never creates a patch operation. Use for values that can never change (e.g. property "type" in elements).
 */
export const constantHandler: Handler<unknown> = () => [];
