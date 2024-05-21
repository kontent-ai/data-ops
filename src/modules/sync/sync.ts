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
import { elementTypes } from "./constants/elements.js";
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

  const addSnippetsOps = [...diff.contentTypeSnippets.updated]
    .map(([c, ops]) =>
      [
        c,
        ops
          .filter(isOp("addInto"))
          .map(op =>
            typeof op.value === "object" && op.value !== null
              ? ({
                ...op,
                value: { ...op.value, allowed_content_types: undefined, allowed_item_link_types: undefined },
              })
              : op
          ),
      ] as const
    );

  await serially(addSnippetsOps.map(
    ([codename, operations]) => () =>
      operations.length
        ? updateSnippet(
          client,
          codename,
          operations,
        )
        : Promise.resolve(),
  ));

  await serially(addSnippetsWithoutReferencesOps.map(s => () => addSnippet(client, s)));
  await serially(addTypesWithoutReferencesOps.map(t => () => addContentType(client, t)));

  const snippetReplaceOpsAddIntoReferencingElements = addSnippetsOps.map((
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
  const snippetsReplaceReferencesOps = diff.contentTypeSnippets.added.map(createUpdateReferencesOps);
  const typesReplaceReferencesOps = diff.contentTypes.added.map(createUpdateReferencesOps);

  const otherSnippetOps = [...diff.contentTypeSnippets.updated.entries()]
    .map(([c, ops]) => [c, ops.filter(o => !isOp("addInto")(o))] as const);

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
