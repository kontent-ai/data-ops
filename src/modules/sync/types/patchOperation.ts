export type AddIntoPatchOperation = Readonly<{
  op: "addInto";
  path: string;
  value: unknown;
  before?: { codename: string };
  after?: { codename: string };
}>;

export type RemovePatchOperation = Readonly<{
  op: "remove";
  path: string;
  oldValue: unknown;
}>;

export type ReplacePatchOperation = Readonly<{
  op: "replace";
  path: string;
  value: unknown;
  oldValue: unknown;
}>;

export type MovePatchOperation =
  & Readonly<{
    op: "move";
    path: string;
  }>
  & Readonly<
    ({ before: { readonly codename: string } } | { after: { readonly codename: string } } | {
      under: { readonly codename: string };
    })
  >;

export type PatchOperation =
  | AddIntoPatchOperation
  | RemovePatchOperation
  | ReplacePatchOperation
  | MovePatchOperation;

export const getTargetCodename = (op: PatchOperation): string | null => {
  const pathParts = op.path.split("/");
  switch (op.op) {
    case "addInto":
    case "replace":
      return pathParts[pathParts.length - 2]?.split(":")[1] ?? null;
    case "remove":
    case "move":
      return pathParts[pathParts.length - 1]?.split(":")[1] ?? null;
  }
};
