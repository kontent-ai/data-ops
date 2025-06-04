import type { ContentTypeElements, SharedModels } from "@kontent-ai/management-sdk";

import type { Replace } from "../../../utils/types.js";

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

export type MovePatchOperation = Readonly<{
  op: "move";
  path: string;
}> &
  Readonly<
    | { before: { readonly codename: string } }
    | { after: { readonly codename: string } }
    | {
        under: { readonly codename: string };
      }
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

export type ObjectReference = Replace<SharedModels.IReferenceObject, { codename: string }>;

export type ExternalIdReference = { external_id: string };

export type DefaultElementValue = {
  global: {
    value:
      | string
      | number
      | ObjectReference
      | ObjectReference[]
      | ExternalIdReference
      | ExternalIdReference[];
  };
};

export type CountLimitation = ContentTypeElements.ILinkedItemsElement["item_count_limit"];

export type DependsOn = ContentTypeElements.IUrlSlugElementData["depends_on"];

export type MaximumTextLength = ContentTypeElements.ITextElementData["maximum_text_length"];

export type ValidationRegex = ContentTypeElements.ITextElementData["validation_regex"];

export type ReplacePatchOperationValue =
  | DefaultElementValue
  | ObjectReference
  | ObjectReference[]
  | CountLimitation
  | MaximumTextLength
  | DependsOn
  | string
  | string[]
  | boolean
  | number;
