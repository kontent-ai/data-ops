import { ManagementClient } from "@kontent-ai/management-sdk";

import { LogOptions, logWarning } from "../../../log.js";
import { serially } from "../../../utils/requests.js";

export const fetchRequiredAssets = async (
  client: ManagementClient,
  assetIds: ReadonlyArray<string>,
  logOptions: LogOptions,
) => {
  const promises = assetIds.map(id => () =>
    client
      .viewAsset()
      .byAssetId(id)
      .toPromise()
      .then(res => res.data._raw)
      .catch(() => {
        logWarning(logOptions, "standard", `Could not find asset with id ${id}`);
        return undefined;
      })
  );

  return await serially(promises);
};

export const fetchRequiredContentItems = async (
  client: ManagementClient,
  itemsIds: ReadonlyArray<string>,
  logOptions: LogOptions,
) => {
  const promises = itemsIds.map(id => () =>
    client
      .viewContentItem()
      .byItemId(id)
      .toPromise()
      .then(res => res.data._raw)
      .catch(() => {
        logWarning(logOptions, "standard", `Could not find item with id ${id}`);
        return undefined;
      })
  );

  return await serially(promises);
};

export const fetchContentTypes = (client: ManagementClient) =>
  client
    .listContentTypes()
    .toAllPromise()
    .then(res => res.data.items.map(t => t._raw));

export const fetchContentTypeSnippets = (client: ManagementClient) =>
  client
    .listContentTypeSnippets()
    .toAllPromise()
    .then(res => res.data.items.map(s => s._raw));

export const fetchTaxonomies = (client: ManagementClient) =>
  client
    .listTaxonomies()
    .toAllPromise()
    .then(res => res.data.items.map(t => t._raw));
