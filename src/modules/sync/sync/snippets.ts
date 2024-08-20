import { ContentTypeElements, ContentTypeSnippetModels, ManagementClient } from "@kontent-ai/management-sdk";

import { omit } from "../../../utils/object.js";
import { serially } from "../../../utils/requests.js";
import { elementTypes } from "../constants/elements.js";
import { DiffModel } from "../types/diffModel.js";
import { PatchOperation } from "../types/patchOperation.js";
import {
  createUpdateReferenceOps,
  createUpdateReferencesOps,
  isOp,
  isReferencingElement,
  ReferencingElement,
  removeReferencesFromAddOp,
} from "./utils.js";

export const addSnippetsWithoutReferences = async (
  client: ManagementClient,
  addSnippets: DiffModel["contentTypeSnippets"]["added"],
) => {
  const addSnippetsWithoutReferences = addSnippets.map(removeReferencesFromAddOp);
  await serially(addSnippetsWithoutReferences.map(s => () => addSnippet(client, s)));
};

export const addSnippetsReferences = async (
  client: ManagementClient,
  updateSnippetAddIntoOps: ReadonlyArray<
    Readonly<[string, ReadonlyArray<Extract<PatchOperation, { op: "addInto" }>>]>
  >,
  addSnippets: DiffModel["contentTypeSnippets"]["added"],
) => {
  const snippetReplaceOpsAddIntoReferencingElements = updateSnippetAddIntoOps.map((
    [codename, ops],
  ) =>
    [
      codename,
      ops
        .filter((op): op is typeof op & { value: ReferencingElement } =>
          isElement(op.value) && isReferencingElement(op.value)
        )
        .flatMap(op => createUpdateReferenceOps(op.value)),
    ] as const
  );
  const snippetsReplaceReferencesOps = addSnippets.map(createUpdateReferencesOps);

  await serially(
    [...snippetReplaceOpsAddIntoReferencingElements, ...snippetsReplaceReferencesOps].map(
      ([codename, operations]) => () =>
        operations.length
          ? updateSnippet(
            client,
            codename,
            operations.map(o => omit(o, ["oldValue"])),
          )
          : Promise.resolve(),
    ),
  );
};

export const addElementsIntoSnippetsWithoutReferences = async (
  client: ManagementClient,
  updateSnippetAddIntoOps: ReadonlyArray<
    Readonly<[string, ReadonlyArray<Extract<PatchOperation, { op: "addInto" }>>]>
  >,
) => {
  const addSnippetsOpsWithoutRefs = updateSnippetAddIntoOps.map((
    [c, ops],
  ) =>
    [
      c,
      ops.map(op =>
        typeof op.value === "object" && op.value !== null
          ? ({
            ...op,
            value: { ...op.value, allowed_content_types: undefined, allowed_item_link_types: undefined },
          })
          : op
      ),
    ] as const
  );

  await serially(addSnippetsOpsWithoutRefs.map(
    ([codename, operations]) => () =>
      operations.length
        ? updateSnippet(client, codename, operations)
        : Promise.resolve(),
  ));
};

export const updateSnippets = async (
  client: ManagementClient,
  updateSnippetsOps: DiffModel["contentTypeSnippets"]["updated"],
) => {
  const otherSnippetOps = [...updateSnippetsOps.entries()]
    .map(([c, ops]) => [c, ops.filter(o => !isOp("addInto")(o))] as const);
  await serially(
    otherSnippetOps.map(
      ([codename, operations]) => () =>
        operations.length
          ? updateSnippet(
            client,
            codename,
            operations.map(op => "oldValue" in op ? omit(op, ["oldValue"]) : op),
          )
          : Promise.resolve(),
    ),
  );
};

const addSnippet = (client: ManagementClient, snippet: ContentTypeSnippetModels.IAddContentTypeSnippetData) =>
  client
    .addContentTypeSnippet()
    .withData(() => snippet)
    .toPromise();

const updateSnippet = (
  client: ManagementClient,
  codename: string,
  snippetData: ContentTypeSnippetModels.IModifyContentTypeSnippetData[],
) =>
  client
    .modifyContentTypeSnippet()
    .byTypeCodename(codename)
    .withData(snippetData)
    .toPromise();

export const deleteSnippet = (
  client: ManagementClient,
  codename: string,
) =>
  client
    .deleteContentTypeSnippet()
    .byTypeCodename(codename)
    .toPromise();

const isElement = (entity: unknown): entity is ContentTypeElements.Element =>
  typeof entity === "object" && entity !== null && "type" in entity && typeof entity.type === "string"
  && elementTypes.has(entity.type);
