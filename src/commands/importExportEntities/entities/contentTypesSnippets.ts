import { ContentTypeSnippetContracts, ElementContracts, ManagementClient } from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { logInfo, LogOptions } from "../../../log.js";
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

type Snippet = Replace<
  FixReferences<ContentTypeSnippetContracts.IContentTypeSnippetContract>,
  "elements",
  ReadonlyArray<SnippetElement>
>;
type SnippetElement = RequiredId<FixReferences<ElementContracts.IContentTypeElementContract>>;

export const contentTypesSnippetsEntity: EntityDefinition<ReadonlyArray<Snippet>> = {
  name: "contentTypesSnippets",
  fetchEntities: client =>
    client
      .listContentTypeSnippets()
      .toAllPromise()
      .then(res => res.data.items.map(s => s._raw as Snippet)),
  serializeEntities: JSON.stringify,
  deserializeEntities: JSON.parse,
  importEntities: async (client, fileSnippets, context, logOptions) => {
    const projectSnippets = await serially(
      fileSnippets.map(createInsertSnippetFetcher({ context, client, logOptions })),
    );

    return {
      ...context,
      contentTypeSnippetContextByOldIds: new Map(
        zip(fileSnippets, projectSnippets).map(makeSnippetContextByOldIdEntry),
      ),
      elementTypesByOldElementIdsByOldSnippetIds: new Map(
        fileSnippets.map(snippet => [snippet.id, new Map(snippet.elements.map(el => [el.id, el.type]))]),
      ),
    };
  },
};

export const updateItemAndTypeReferencesInSnippetsImportEntity: EntityImportDefinition<ReadonlyArray<Snippet>> = {
  name: "contentTypesSnippets",
  isDependentOn: contentTypesSnippetsEntity.name,
  deserializeEntities: JSON.parse,
  importEntities: async (client, fileSnippets, context, logOptions) => {
    await serially(fileSnippets.map(createUpdateSnippetItemAndTypeReferencesFetcher({ client, context, logOptions })));
  },
};

const makeSnippetContextByOldIdEntry = (
  [fileSnippet, projectSnippet]: readonly [Snippet, Snippet],
): readonly [string, MapValues<ImportContext["contentTypeSnippetContextByOldIds"]>] => {
  const elementIdEntries = zip(fileSnippet.elements, projectSnippet.elements)
    .map(([fileEl, projectEl]) => [fileEl.id, projectEl.id] as const);

  return [fileSnippet.id, {
    selfId: projectSnippet.id,
    elementIdsByOldIds: new Map(elementIdEntries),
    elementTypeByOldIds: new Map(fileSnippet.elements.map(el => [el.id, el.type])),
    multiChoiceOptionIdsByOldIdsByOldElementId: new Map(
      fileSnippet.elements
        .flatMap(el => {
          if (el.type !== "multiple_choice") {
            return [];
          }

          const typedEl = el as MultiChoiceElement;
          const projectTypedEl = projectSnippet.elements
            .find(e => e.codename === el.codename) as MultiChoiceElement;
          const multiChoiceOptionEntries = zip(typedEl.options, projectTypedEl.options)
            .map(([fO, pO]) => [fO.id, pO.id] as const);

          return [[el.id, new Map(multiChoiceOptionEntries)]];
        }),
    ),
  }];
};

type InsertSnippetParams = Readonly<{
  client: ManagementClient;
  context: ImportContext;
  logOptions: LogOptions;
}>;

const createInsertSnippetFetcher = (params: InsertSnippetParams) => (snippet: Snippet) => async () => {
  logInfo(params.logOptions, "verbose", `Importing: snippet ${snippet.id} (${chalk.yellow(snippet.name)})`);

  return params.client
    .addContentTypeSnippet()
    .withData(builder => ({
      name: snippet.name,
      codename: snippet.codename,
      external_id: snippet.external_id ?? snippet.codename,
      elements: snippet.elements.map(createTransformTypeElement({
        ...params,
        builder,
        typeOrSnippetCodename: snippet.codename,
        elementExternalIdsByOldId: new Map(
          snippet.elements.map(el => [el.id, el.external_id ?? `${snippet.codename}_${el.codename}`]),
        ),
        contentGroupExternalIdByOldId: new Map(),
      })),
    }))
    .toPromise()
    .then(res => res.rawData as Snippet);
};

type UpdateSnippetParams = Readonly<{
  client: ManagementClient;
  context: ImportContext;
  logOptions: LogOptions;
}>;

const createUpdateSnippetItemAndTypeReferencesFetcher = (params: UpdateSnippetParams) => (snippet: Snippet) => () => {
  const patchOps = snippet.elements
    .flatMap(
      createPatchItemAndTypeReferencesInTypeElement(
        params.context,
        getRequired(params.context.contentTypeSnippetContextByOldIds, snippet.id, "snippet").elementIdsByOldIds,
      ),
    );

  if (!patchOps.length) {
    return Promise.resolve();
  }

  logInfo(
    params.logOptions,
    "verbose",
    `Patching: snippet ${snippet.id} (${chalk.yellow(snippet.name)}) with new references`,
  );

  return params.client
    .modifyContentTypeSnippet()
    .byTypeCodename(snippet.codename)
    .withData(patchOps)
    .toPromise();
};
