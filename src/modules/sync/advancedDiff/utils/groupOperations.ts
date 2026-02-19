import type {
  AddIntoPatchOperation,
  MovePatchOperation,
  PatchOperation,
  RemovePatchOperation,
  ReplacePatchOperation,
} from "../../types/patchOperation.js";

export type GroupedElementOps = Readonly<{
  replaces: ReadonlyArray<ReplacePatchOperation>;
  adds: ReadonlyArray<AddIntoPatchOperation>;
  removes: ReadonlyArray<RemovePatchOperation>;
  moves: ReadonlyArray<MovePatchOperation>;
}>;

export type GroupedOps = Readonly<{
  elements: ReadonlyMap<string, GroupedElementOps>;
  entityLevel: GroupedElementOps;
}>;

const emptyGroup: GroupedElementOps = { replaces: [], adds: [], removes: [], moves: [] };

const elementPropertyPathRegex = /^\/elements\/codename:([^/]+)\/.+$/;

const getElementCodename = (path: string): string | null =>
  path.match(elementPropertyPathRegex)?.[1] ?? null;

const addToGroup = (group: GroupedElementOps, op: PatchOperation): GroupedElementOps => {
  switch (op.op) {
    case "replace":
      return { ...group, replaces: [...group.replaces, op] };
    case "addInto":
      return { ...group, adds: [...group.adds, op] };
    case "remove":
      return { ...group, removes: [...group.removes, op] };
    case "move":
      return { ...group, moves: [...group.moves, op] };
    default: {
      const _exhaustive: never = op;
      return _exhaustive;
    }
  }
};

export const groupOperations = (operations: ReadonlyArray<PatchOperation>): GroupedOps =>
  operations.reduce<GroupedOps>(
    (acc, op) => {
      const elementCodename = getElementCodename(op.path);
      if (!elementCodename) {
        return { ...acc, entityLevel: addToGroup(acc.entityLevel, op) };
      }
      const existing = acc.elements.get(elementCodename) ?? emptyGroup;
      return {
        ...acc,
        elements: new Map([...acc.elements, [elementCodename, addToGroup(existing, op)]]),
      };
    },
    { elements: new Map(), entityLevel: emptyGroup },
  );

export const extractPropertyPath = (path: string, elementCodename?: string): string => {
  if (elementCodename) {
    const prefix = `/elements/codename:${elementCodename}/`;
    return path.startsWith(prefix) ? path.slice(prefix.length) : path.replace(/^\//, "");
  }
  return path.replace(/^\//, "");
};

export const getRemoveArrayProperty = (path: string, elementCodename?: string): string => {
  const propertyPath = extractPropertyPath(path, elementCodename);
  const lastSlash = propertyPath.lastIndexOf("/");
  return lastSlash >= 0 ? propertyPath.slice(0, lastSlash) : propertyPath;
};

export const formatPropertyName = (propertyPath: string): string =>
  propertyPath.replace(/codename:/g, "").replace(/\//g, " / ");

export const countOps = (group: GroupedElementOps) => ({
  adds: group.adds.length,
  modifies: group.replaces.length,
  removes: group.removes.length,
  moves: group.moves.length,
  total: group.adds.length + group.replaces.length + group.removes.length + group.moves.length,
});
