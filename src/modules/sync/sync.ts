import {
  ContentTypeElements,
  ContentTypeModels,
  ContentTypeSnippetModels,
  ManagementClient,
  SharedContracts,
  TaxonomyModels,
} from "@kontent-ai/management-sdk";

import { omit } from "../../utils/object.js";
import { serially } from "../../utils/requests.js";
import { notNullOrUndefined } from "../../utils/typeguards.js";
import { RequiredCodename } from "../../utils/types.js";
import { ElementsTypes } from "./types/contractModels.js";
import { DiffModel, PatchOperation } from "./types/diffModel.js";

const referencingElements: ReadonlyArray<ElementsTypes> = ["rich_text", "modular_content", "subpages"];
const referenceProps = ["allowed_content_types", "allowed_item_link_types"] as const;
type PropName = typeof referenceProps[number];

export const sync = async (client: ManagementClient, diff: DiffModel) => {
  // there order of these operations is important
  await serially(diff.taxonomyGroups.added.map(g => () => addTaxonomyGroup(client, g)));

  await serially(
    Array.from(diff.taxonomyGroups.updated.entries()).map(([codename, operations]) => () =>
      operations.length
        ? updateTaxonomyGroup(
          client,
          codename,
          operations.map(transformTaxonomyOperations),
        )
        : Promise.resolve()
    ),
  );

  await serially(Array.from(diff.taxonomyGroups.deleted).map(c => () => deleteTaxonomyGroup(client, c)));

  const addSnippetsWithoutReferencesOps = diff.contentTypeSnippets.added.map(removeReferencesFromAddOp);
  const addTypesWithoutReferencesOps = diff.contentTypes.added.map(removeReferencesFromAddOp);

  await serially(addSnippetsWithoutReferencesOps.map(s => () => addSnippet(client, s)));
  await serially(addTypesWithoutReferencesOps.map(t => () => addContentType(client, t)));

  const snippetsReplaceReferencesOps = diff.contentTypeSnippets.added.map(createUpdateReferencesOps);
  const typesReplaceReferencesOps = diff.contentTypes.added.map(createUpdateReferencesOps);

  const addSnippetsOps = [...diff.contentTypeSnippets.updated.entries()]
    .map(([c, ops]) => [c, ops.filter(isOp("addInto"))] as const);
  const otherSnippetOps = [...diff.contentTypeSnippets.updated.entries()]
    .map(([c, ops]) => [c, ops.filter(o => !isOp("addInto")(o))] as const);

  await serially(
    [...addSnippetsOps, ...snippetsReplaceReferencesOps].map(
      ([codename, operations]) => () =>
        operations.length
          ? updateSnippet(
            client,
            codename,
            operations.map(o =>
              o.op === "replace"
                ? omit(o, ["oldValue"])
                : o as unknown as ContentTypeSnippetModels.IModifyContentTypeSnippetData // fix once sdks type are fixed
            ),
          )
          : Promise.resolve(),
    ),
  );

  await serially(
    [...diff.contentTypes.updated.entries(), ...typesReplaceReferencesOps].map(([codename, operations]) => () =>
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

  await serially(Array.from(diff.contentTypes.deleted).map(c => () => deleteContentType(client, c)));

  await serially(Array.from(diff.contentTypeSnippets.deleted).map(c => () => deleteSnippet(client, c)));

  // replace, remove, move operations
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
  const termReference = pathParts[pathParts.length - 2];

  return {
    ...operation,
    path: undefined,
    reference: termReference === "" ? undefined : {
      codename: termReference?.split(":")[1],
    },
    property_name: operation.op === "replace" ? propertyName : undefined,
    oldValue: undefined,
  } as unknown as TaxonomyModels.IModifyTaxonomyData;
};

const createUpdateReferencesOps = (
  entity:
    | RequiredCodename<ContentTypeModels.IAddContentTypeData>
    | RequiredCodename<ContentTypeSnippetModels.IAddContentTypeSnippetData>,
) =>
  [
    entity.codename,
    entity.elements
      .filter(isReferencingElement)
      .flatMap(e =>
        e.type === "rich_text"
          ? [
            createUpdateOp(e.codename as string, "allowed_content_types", e.allowed_content_types ?? []),
            createUpdateOp(e.codename as string, "allowed_item_link_types", e.allowed_item_link_types ?? []),
          ]
          : [createUpdateOp(e.codename as string, "allowed_content_types", e.allowed_content_types ?? [])]
      )
      .filter(notNullOrUndefined),
  ] as const;

const isReferencingElement = (
  element: ContentTypeElements.Element,
): element is
  | ContentTypeElements.ILinkedItemsElement
  | ContentTypeElements.IRichTextElement
  | ContentTypeElements.ISubpagesElement => referencingElements.includes(element.type);

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
