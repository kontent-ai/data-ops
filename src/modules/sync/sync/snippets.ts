import { ContentTypeElements, ContentTypeSnippetModels, ManagementClient } from "@kontent-ai/management-sdk";

import { logInfo, LogOptions } from "../../../log.js";
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
  logOptions: LogOptions,
) => {
  if (!addSnippets.length) {
    logInfo(logOptions, "standard", "No content type snippets to add");
    return;
  }
  logInfo(logOptions, "standard", "Adding content type snippets");
  const addSnippetsWithoutReferences = addSnippets.map(removeReferencesFromAddOp);
  await serially(addSnippetsWithoutReferences.map(s => () => addSnippet(client, s)));
};

export const addSnippetsReferences = async (
  client: ManagementClient,
  updateSnippetAddIntoOps: ReadonlyArray<
    Readonly<[string, ReadonlyArray<Extract<PatchOperation, { op: "addInto" }>>]>
  >,
  addSnippets: DiffModel["contentTypeSnippets"]["added"],
  logOptions: LogOptions,
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

  if (snippetsReplaceReferencesOps.every(([, arr]) => !arr.length)) {
    logInfo(logOptions, "standard", "No content type snippet's references to update");
    return;
  }

  logInfo(logOptions, "standard", "Updating content type snippet's references");
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
  logOptions: LogOptions,
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

  if (addSnippetsOpsWithoutRefs.every(([, ops]) => !ops.length)) {
    logInfo(logOptions, "standard", "No elements to add into content type snippets");
    return;
  }

  logInfo(logOptions, "standard", "Adding elements into content type snippets");
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
  logOptions: LogOptions,
) => {
  const otherSnippetOps = [...updateSnippetsOps.entries()]
    .map(([c, ops]) => [c, ops.filter(o => !isOp("addInto")(o))] as const);

  if (otherSnippetOps.flatMap(([, ops]) => ops).length === 0) {
    logInfo(logOptions, "standard", "No content type snippets to update");
    return;
  }

  logInfo(logOptions, "standard", "Updating content type snippets");
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

export const deleteContentTypeSnippets = async (
  client: ManagementClient,
  snippetOps: DiffModel["contentTypeSnippets"],
  logOptions: LogOptions,
) => {
  if (snippetOps.deleted.size) {
    logInfo(logOptions, "standard", "Deleting content type snippets");
    await serially(Array.from(snippetOps.deleted).map(c => () => deleteSnippet(client, c)));
  } else {
    logInfo(logOptions, "standard", "No content type snippets to delete");
  }
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

const deleteSnippet = (
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
