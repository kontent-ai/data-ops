import {
  ContentTypeContracts,
  ContentTypeElements,
  ElementContracts,
  ManagementClient,
} from "@kontent-ai/management-sdk";

import { zip } from "../../../utils/array.js";
import { serially } from "../../../utils/requests.js";
import { FixReferences, MapValues, Replace, RequiredId } from "../../../utils/types.js";
import { getRequired } from "../../import/utils.js";
import { EntityDefinition, EntityImportDefinition, ImportContext } from "../entityDefinition.js";
import {
  createPatchItemAndTypeReferencesInTypeElement,
  createTransformTypeElement,
  MultiChoiceElement,
} from "./utils/typeElements.js";

type Type = Replace<
  Replace<FixReferences<ContentTypeContracts.IContentTypeContract>, "elements", ReadonlyArray<TypeElement>>,
  "content_groups",
  ReadonlyArray<ElementGroup>,
  true
>;
type TypeElement = RequiredId<FixReferences<ElementContracts.IContentTypeElementContract>>;
type ElementGroup = RequiredId<ContentTypeContracts.IContentTypeGroup>;

export const contentTypesEntity: EntityDefinition<ReadonlyArray<Type>> = {
  name: "contentTypes",
  fetchEntities: client =>
    client
      .listContentTypes()
      .toAllPromise()
      .then(res => res.data.items.map(t => t._raw as Type)),
  serializeEntities: collections => JSON.stringify(collections),
  importEntities: async (client, fileTypes, context) => {
    const projectTypes = await serially(fileTypes.map(createInsertTypeFetcher({ context, client })));

    return {
      ...context,
      contentTypeContextByOldIds: new Map(zip(fileTypes, projectTypes).map(createMakeTypeContextByOldIdEntry(context))),
    };
  },
  deserializeEntities: JSON.parse,
};

export const updateItemAndTypeReferencesInTypesImportEntity: EntityImportDefinition<ReadonlyArray<Type>> = {
  name: "contentTypes",
  isDependentOn: contentTypesEntity.name,
  deserializeEntities: JSON.parse,
  importEntities: async (client, fileTypes, context) => {
    await serially(fileTypes.map(createUpdateTypeItemReferencesFetcher({ client, context })));
  },
};

type InsertTypeParams = Readonly<{
  client: ManagementClient;
  context: ImportContext;
}>;

type SnippetElement = FixReferences<ContentTypeElements.ISnippetElement>;

const createMakeTypeContextByOldIdEntry = (context: ImportContext) =>
(
  [fileType, projectType]: readonly [Type, Type],
): readonly [string, MapValues<ImportContext["contentTypeContextByOldIds"]>] => {
  const elementIdEntries = zip(fileType.elements, projectType.elements)
    .flatMap(([fileEl, projectEl]) => {
      if (fileEl.type === "snippet") {
        const typedEl = fileEl as unknown as SnippetElement;
        return [
          ...getRequired(context.contentTypeSnippetContextByOldIds, typedEl.snippet.id, "snippet")
            .elementIdsByOldIds,
        ];
      }

      return [[fileEl.id, projectEl.id] as const];
    });

  return [fileType.id, {
    selfId: projectType.id,
    elementIdsByOldIds: new Map(elementIdEntries),
    elementTypeByOldIds: new Map(
      fileType.elements
        .flatMap(el => {
          if (el.type === "snippet") {
            const typedEl = el as unknown as SnippetElement;
            return [
              ...getRequired(context.contentTypeSnippetContextByOldIds, typedEl.snippet.id, "snippet")
                .elementTypeByOldIds,
            ];
          }

          return [[el.id, el.type]];
        }),
    ),
    multiChoiceOptionIdsByOldIdsByOldElementId: new Map(
      fileType.elements
        .flatMap(el => {
          switch (el.type) {
            case "snippet": {
              const typedEl = el as unknown as SnippetElement;
              return [
                ...getRequired(context.contentTypeSnippetContextByOldIds, typedEl.snippet.id, "snippet")
                  .multiChoiceOptionIdsByOldIdsByOldElementId,
              ];
            }
            case "multiple_choice": {
              const typedEl = el as MultiChoiceElement;
              const typedProjectEl = projectType.elements.find(e => e.id === el.id) as MultiChoiceElement;

              return [[
                el.id,
                new Map(
                  zip(typedEl.options, typedProjectEl.options).map(([fO, pO]) => [fO.id, pO.id]),
                ),
              ]];
            }
            default:
              return [];
          }
        }),
    ),
  }];
};

const createInsertTypeFetcher = (params: InsertTypeParams) => (type: Type) => async () =>
  params.client
    .addContentType()
    .withData(builder => ({
      name: type.name,
      codename: type.codename,
      external_id: type.external_id ?? type.codename,
      content_groups: type.content_groups?.map(g => ({ ...g, external_id: g.external_id ?? g.codename })),
      elements: type.elements.map(createTransformTypeElement({
        ...params,
        builder,
        typeOrSnippetCodename: type.codename,
        elementExternalIdsByOldId: new Map(
          type.elements.map(el => [el.id, el.external_id ?? `${type.codename}_${el.codename}`]),
        ),
        contentGroupExternalIdByOldId: new Map(
          type.content_groups?.map(g => [g.id, g.external_id ?? g.codename ?? ""] as const) ?? [],
        ),
      })),
    }))
    .toPromise()
    .then(res => res.rawData as Type);

type UpdateTypeParams = Readonly<{
  client: ManagementClient;
  context: ImportContext;
}>;

const createUpdateTypeItemReferencesFetcher = (params: UpdateTypeParams) => (type: Type) => () => {
  const patchOps = type.elements
    .filter(el => el.type !== "snippet") // We don't need to update snippet elements and snippets are expanded (not present) in the elementIdsByOldIds context
    .flatMap(
      createPatchItemAndTypeReferencesInTypeElement(
        params.context,
        getRequired(params.context.contentTypeContextByOldIds, type.id, "content type").elementIdsByOldIds,
      ),
    );

  if (!patchOps.length) {
    return Promise.resolve();
  }

  return params.client
    .modifyContentType()
    .byTypeCodename(type.codename)
    .withData(patchOps)
    .toPromise();
};
