import type {
  ContentTypeElements,
  ContentTypeModels,
  ContentTypeSnippetModels,
  SharedContracts,
} from "@kontent-ai/management-sdk";

import { notNullOrUndefined } from "../../../utils/typeguards.js";
import type { RequiredCodename } from "../../../utils/types.js";
import type { ElementsTypes } from "../types/contractModels.js";
import type { PatchOperation } from "../types/patchOperation.js";

export type ReferencingElement =
  | ContentTypeElements.ILinkedItemsElement
  | ContentTypeElements.IRichTextElement
  | ContentTypeElements.ISubpagesElement;

const referencingElements: ReadonlyArray<ElementsTypes> = [
  "rich_text",
  "modular_content",
  "subpages",
];

export const isReferencingElement = (
  element: ContentTypeElements.Element,
): element is ReferencingElement => referencingElements.includes(element.type);

export const isOp =
  <OpName extends PatchOperation["op"]>(opName: OpName) =>
  (op: PatchOperation): op is Extract<PatchOperation, { op: OpName }> =>
    op.op === opName;

export const removeReferencesFromAddOp = (
  entity:
    | RequiredCodename<ContentTypeModels.IAddContentTypeData>
    | RequiredCodename<ContentTypeSnippetModels.IAddContentTypeSnippetData>,
) => ({
  ...entity,
  elements: entity.elements.map((e) =>
    isReferencingElement(e)
      ? {
          ...e,
          allowed_content_types: undefined,
          allowed_item_link_types: undefined,
        }
      : e,
  ),
});

export const createUpdateReferenceOps = (element: ReferencingElement) =>
  (element.type === "rich_text"
    ? [
        createUpdateOp(
          element.codename as string,
          "allowed_content_types",
          element.allowed_content_types ?? [],
        ),
        createUpdateOp(
          element.codename as string,
          "allowed_item_link_types",
          element.allowed_item_link_types ?? [],
        ),
      ]
    : [
        createUpdateOp(
          element.codename as string,
          "allowed_content_types",
          element.allowed_content_types ?? [],
        ),
      ]
  ).filter(notNullOrUndefined);

export const createUpdateReferencesOps = (
  entity:
    | RequiredCodename<ContentTypeModels.IAddContentTypeData>
    | RequiredCodename<ContentTypeSnippetModels.IAddContentTypeSnippetData>,
) =>
  [
    entity.codename,
    entity.elements
      .filter(isReferencingElement)
      .flatMap(createUpdateReferenceOps)
      .filter(notNullOrUndefined),
  ] as const;

type PropName = "allowed_content_types" | "allowed_item_link_types";

const createUpdateOp = (
  elementCodename: string,
  propertyName: PropName,
  reference: ReadonlyArray<SharedContracts.IReferenceObjectContract>,
): Extract<PatchOperation, { op: "replace" }> | undefined =>
  reference.length === 0
    ? undefined
    : {
        op: "replace",
        path: `/elements/codename:${elementCodename}/${propertyName}`,
        value: reference,
        oldValue: [],
      };
