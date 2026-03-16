import { isOp } from "../../sync/utils.js";
import type { PatchOperation } from "../../types/patchOperation.js";

export type GroupedElementOps = Readonly<{
  replaces: ReadonlyArray<Extract<PatchOperation, { op: "replace" }>>;
  adds: ReadonlyArray<Extract<PatchOperation, { op: "addInto" }>>;
  removes: ReadonlyArray<Extract<PatchOperation, { op: "remove" }>>;
  moves: ReadonlyArray<Extract<PatchOperation, { op: "move" }>>;
}>;

export type OpCounts = Readonly<{
  adds: number;
  modifies: number;
  removes: number;
  moves: number;
  total: number;
}>;

const elementPropertyPathRegex = /^\/elements\/codename:([^/]+)\/.+$/;

const getElementCodename = (path: string): string | null =>
  path.match(elementPropertyPathRegex)?.[1] ?? null;

export const groupOperations = (operations: ReadonlyArray<PatchOperation>): GroupedElementOps => ({
  replaces: operations.filter(isOp("replace")),
  adds: operations.filter(isOp("addInto")),
  removes: operations.filter(isOp("remove")),
  moves: operations.filter(isOp("move")),
});

export const groupEntityWithElements = (operations: ReadonlyArray<PatchOperation>) => {
  const withCodename = operations.flatMap((op) => {
    const codename = getElementCodename(op.path);
    return codename ? [{ codename, op }] : [];
  });

  return {
    entityLevel: groupOperations(operations.filter((op) => !getElementCodename(op.path))),
    elements: new Map(
      [...Map.groupBy(withCodename, (e) => e.codename)].map(
        ([codename, entries]) => [codename, groupOperations(entries.map((e) => e.op))] as const,
      ),
    ),
  };
};

export const stripElementPrefix = (path: string, elementCodename?: string): string => {
  if (elementCodename) {
    const prefix = `/elements/codename:${elementCodename}/`;
    return path.startsWith(prefix) ? path.slice(prefix.length) : path.slice(1);
  }
  return path.slice(1);
};

export const stripEntityPrefix = (path: string, prefix: string): string => {
  if (!path.startsWith(prefix)) {
    return path;
  }
  return path.slice(prefix.length);
};

export const getRemoveArrayProperty = (path: string, elementCodename?: string): string => {
  const propertyPath = stripElementPrefix(path, elementCodename);
  const lastSlash = propertyPath.lastIndexOf("/");
  return lastSlash >= 0 ? propertyPath.slice(0, lastSlash) : propertyPath;
};

export const formatPropertyName = (propertyPath: string): string =>
  propertyPath.replace(/codename:/g, "").replace(/\//g, " / ");

export const countOps = (group: GroupedElementOps): OpCounts => ({
  adds: group.adds.length,
  modifies: group.replaces.length,
  removes: group.removes.length,
  moves: group.moves.length,
  total: group.adds.length + group.replaces.length + group.removes.length + group.moves.length,
});
