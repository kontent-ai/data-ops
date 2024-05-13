import {
  ContentTypeModels,
  ContentTypeSnippetModels,
  ManagementClient,
  TaxonomyModels,
} from "@kontent-ai/management-sdk";

import { serially } from "../../utils/requests.js";
import { DiffModel, PatchOperation } from "./types/diffModel.js";

export const sync = async (client: ManagementClient, diff: DiffModel) => {
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

  // await serially(diff.contentTypeSnippets.added.map(s => () => addSnippet(client, s)));

  // // fix once sdks type are fixed
  // await serially(
  //   Array.from(diff.contentTypeSnippets.updated.entries()).map(([codename, operations]) => () =>
  //     operations.length
  //       ? updateSnippet(
  //         client,
  //         codename,
  //         operations.map(o =>
  //           o.op === "replace"
  //             ? omit(o, ["oldValue"])
  //             : o as unknown as ContentTypeSnippetModels.IModifyContentTypeSnippetData
  //         ),
  //       )
  //       : Promise.resolve()
  //   ),
  // );
  addSnippet as never;
  updateSnippet as never;

  // await serially(diff.contentTypes.added.map(t => () => addContentType(client, t)));

  // await serially(
  //   Array.from(diff.contentTypes.updated.entries()).map(([codename, operations]) => () =>
  //     operations.length
  //       ? updateContentType(
  //         client,
  //         codename,
  //         operations.map(o =>
  //           o.op === "replace"
  //             ? omit(o, ["oldValue"])
  //             : o as unknown as ContentTypeModels.IModifyContentTypeData
  //         ),
  //       )
  //       : Promise.resolve()
  //   ),
  // );

  addContentType as never;
  updateContentType as never;

  await serially(Array.from(diff.taxonomyGroups.deleted).map(c => () => deleteTaxonomyGroup(client, c)));
  deleteSnippet as never;
  deleteContentType as never;
  // await serially(Array.from(diff.contentTypeSnippets.deleted).map(c => () => deleteSnippet(client, c)));
  // await serially(Array.from(diff.contentTypes.deleted).map(c => () => deleteContentType(client, c)));
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
