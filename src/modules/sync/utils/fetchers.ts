import { ManagementClient } from "@kontent-ai/management-sdk";

import { serially } from "../../../utils/requests.js";

export const fetchRequiredAssets = async (client: ManagementClient, assetIds: ReadonlyArray<string>) => {
  const promises = assetIds.map(id => () =>
    client
      .viewAsset()
      .byAssetId(id)
      .toPromise()
      .then(res => res.data._raw)
  );

  return await serially(promises);
};

export const fetchRequiredContentItems = async (client: ManagementClient, itemsIds: ReadonlyArray<string>) => {
  const promises = itemsIds.map(id => () =>
    client
      .viewContentItem()
      .byItemId(id)
      .toPromise()
      .then(res => res.data._raw)
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
