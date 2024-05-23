import {
  ContentTypeElements,
  ContentTypeModels,
  ContentTypeSnippetModels,
  ManagementClient,
  SharedContracts,
  TaxonomyModels,
} from "@kontent-ai/management-sdk";

import { logInfo, LogOptions } from "../../log.js";
import { omit } from "../../utils/object.js";
import { serially } from "../../utils/requests.js";
import { notNullOrUndefined } from "../../utils/typeguards.js";
import { RequiredCodename } from "../../utils/types.js";
import { elementTypes } from "./constants/elements.js";
import { ElementsTypes } from "./types/contractModels.js";
import { DiffModel, PatchOperation } from "./types/diffModel.js";

const referencingElements: ReadonlyArray<ElementsTypes> = ["rich_text", "modular_content", "subpages"];
const referenceProps = ["allowed_content_types", "allowed_item_link_types"] as const;
type PropName = typeof referenceProps[number];

export const sync = async (client: ManagementClient, diff: DiffModel, logOptions: LogOptions) => {
  // there order of these operations is very important
  await syncTaxonomies(client, diff.taxonomyGroups, logOptions);

  logInfo(logOptions, "standard", "Adding content type snippets");
  await addSnippetsWithoutReferences(client, diff.contentTypeSnippets.added);

  const updateSnippetAddIntoOps = [...diff.contentTypeSnippets.updated]
    .map(([c, ops]) => [c, ops.filter(isOp("addInto"))] as const);

  logInfo(logOptions, "standard", "Adding elements into content type snippets");
  await addElementsIntoSnippetsWithoutReferences(client, updateSnippetAddIntoOps);

  logInfo(logOptions, "standard", "Adding content types");
  await addTypesWithoutReferences(client, diff.contentTypes.added);

  logInfo(logOptions, "standard", "Updating content type snippet's references");
  await addSnippetsReferences(client, updateSnippetAddIntoOps, diff.contentTypeSnippets.added);

  logInfo(logOptions, "standard", "Updating content types and adding their references");
  await updateContentTypesAndAddReferences(client, diff.contentTypes);

  logInfo(logOptions, "standard", "Removing content types");
  await serially(Array.from(diff.contentTypes.deleted).map(c => () => deleteContentType(client, c)));

  logInfo(logOptions, "standard", "Removing content type snippets");
  await serially(Array.from(diff.contentTypeSnippets.deleted).map(c => () => deleteSnippet(client, c)));

  // replace, remove, move operations
  logInfo(logOptions, "standard", "Updating content type snippets");
  await updateSnippets(client, diff.contentTypeSnippets.updated);
};

const syncTaxonomies = async (
  client: ManagementClient,
  taxonomies: DiffModel["taxonomyGroups"],
  logOptions: LogOptions,
) => {
  logInfo(logOptions, "standard", "Adding taxonomies");
  await serially(taxonomies.added.map(g => () => addTaxonomyGroup(client, g)));

  logInfo(logOptions, "standard", "Updating taxonomies");
  await serially(
    Array.from(taxonomies.updated.entries()).map(([codename, operations]) => () =>
      operations.length
        ? updateTaxonomyGroup(
          client,
          codename,
          operations.map(transformTaxonomyOperations),
        )
        : Promise.resolve()
    ),
  );

  logInfo(logOptions, "standard", "Deleting taxonomies");
  await serially(Array.from(taxonomies.deleted).map(c => () => deleteTaxonomyGroup(client, c)));
};

const addElementsIntoSnippetsWithoutReferences = async (
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

const addSnippetsWithoutReferences = async (
  client: ManagementClient,
  addSnippets: DiffModel["contentTypeSnippets"]["added"],
) => {
  const addSnippetsWithoutReferences = addSnippets.map(removeReferencesFromAddOp);
  await serially(addSnippetsWithoutReferences.map(s => () => addSnippet(client, s)));
};

const addTypesWithoutReferences = async (
  client: ManagementClient,
  addContentTypes: DiffModel["contentTypes"]["added"],
) => {
  const addTypesWithoutReferences = addContentTypes.map(removeReferencesFromAddOp);
  await serially(addTypesWithoutReferences.map(t => () => addContentType(client, t)));
};

const addSnippetsReferences = async (
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

const updateContentTypesAndAddReferences = async (
  client: ManagementClient,
  typeOps: DiffModel["contentTypes"],
) => {
  const typesReplaceReferencesOps = typeOps.added.map(createUpdateReferencesOps);

  await serially(
    [...typeOps.updated.entries(), ...typesReplaceReferencesOps].map(([codename, operations]) => () =>
      operations.length
        ? updateContentType(
          client,
          codename,
          operations.map(o =>
            o.op === "replace" || o.op === "remove"
              ? omit(o, ["oldValue"])
              : o as unknown as ContentTypeModels.IModifyContentTypeData
          ),
        )
        : Promise.resolve()
    ),
  );
};

const updateSnippets = async (
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

const addContentType = (client: ManagementClient, type: ContentTypeModels.IAddContentTypeData) =>
  client
    .addContentType()
    .withData(() => type)
    .toPromise();

const updateContentType = (
  client: ManagementClient,
  codename: string,
  typeData: ContentTypeModels.IModifyContentTypeData[],
) =>
  client
    .modifyContentType()
    .byTypeCodename(codename)
    .withData(typeData)
    .toPromise();

const deleteContentType = (
  client: ManagementClient,
  codename: string,
) =>
  client
    .deleteContentType()
    .byTypeCodename(codename)
    .toPromise();

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

const addTaxonomyGroup = (client: ManagementClient, taxonomy: TaxonomyModels.IAddTaxonomyRequestModel) =>
  client
    .addTaxonomy()
    .withData(taxonomy)
    .toPromise();

const updateTaxonomyGroup = (
  client: ManagementClient,
  codename: string,
  taxonomyData: TaxonomyModels.IModifyTaxonomyData[],
) =>
  client
    .modifyTaxonomy()
    .byTaxonomyCodename(codename)
    .withData(taxonomyData)
    .toPromise();

const deleteTaxonomyGroup = (
  client: ManagementClient,
  codename: string,
) =>
  client
    .deleteTaxonomy()
    .byTaxonomyCodename(codename)
    .toPromise();

const transformTaxonomyOperations = (
  operation: PatchOperation,
): TaxonomyModels.IModifyTaxonomyData => {
  const pathParts = operation.path.split("/");
  const propertyName = pathParts[pathParts.length - 1];
  const termReference = operation.op === "replace" ? pathParts[pathParts.length - 2] : pathParts[pathParts.length - 1];
  const codename = termReference?.split(":")[1];

  return {
    ...operation,
    path: undefined,
    reference: codename
      ? {
        codename: codename,
      }
      : undefined,
    property_name: operation.op === "replace" ? propertyName : undefined,
    oldValue: undefined,
  } as unknown as TaxonomyModels.IModifyTaxonomyData;
};

const createUpdateReferenceOps = (
  element: ReferencingElement,
) =>
  (element.type === "rich_text"
    ? [
      createUpdateOp(element.codename as string, "allowed_content_types", element.allowed_content_types ?? []),
      createUpdateOp(element.codename as string, "allowed_item_link_types", element.allowed_item_link_types ?? []),
    ]
    : [createUpdateOp(element.codename as string, "allowed_content_types", element.allowed_content_types ?? [])])
    .filter(notNullOrUndefined);

const createUpdateReferencesOps = (
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

type ReferencingElement =
  | ContentTypeElements.ILinkedItemsElement
  | ContentTypeElements.IRichTextElement
  | ContentTypeElements.ISubpagesElement;

const isElement = (entity: unknown): entity is ContentTypeElements.Element =>
  typeof entity === "object" && entity !== null && "type" in entity && typeof entity.type === "string"
  && elementTypes.has(entity.type);

const isReferencingElement = (
  element: ContentTypeElements.Element,
): element is ReferencingElement => referencingElements.includes(element.type);

const removeReferencesFromAddOp = (
  entity:
    | RequiredCodename<ContentTypeModels.IAddContentTypeData>
    | RequiredCodename<ContentTypeSnippetModels.IAddContentTypeSnippetData>,
) => ({
  ...entity,
  elements: entity.elements
    .map(e =>
      isReferencingElement(e)
        ? ({
          ...e,
          allowed_content_types: undefined,
          allowed_item_link_types: undefined,
        })
        : e
    ),
});

const createUpdateOp = (
  elementCodename: string,
  propertyName: PropName,
  reference: ReadonlyArray<SharedContracts.IReferenceObjectContract>,
): Extract<PatchOperation, { op: "replace" }> | undefined =>
  reference.length === 0 ? undefined : ({
    op: "replace",
    path: `/elements/codename:${elementCodename}/${propertyName}`,
    value: reference,
    oldValue: [],
  });

const isOp =
  <OpName extends PatchOperation["op"]>(opName: OpName) =>
  (op: PatchOperation): op is Extract<PatchOperation, { op: OpName }> => op.op === opName;
