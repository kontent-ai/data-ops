import { ManagementClient } from "@kontent-ai/management-sdk";

import { skipKontentErrors } from "../../../utils/error.js";
import { serially } from "../../../utils/requests.js";
import { notNullOrUndefined } from "../../../utils/typeguards.js";

export const fetchRequiredAssets = async (client: ManagementClient, assetIds: ReadonlyArray<string>) => {
  const promises = assetIds.map(id => () =>
    client
      .viewAsset()
      .byAssetId(id)
      .toPromise()
      .then(res => res.data._raw)
      .catch(skipKontentErrors([105, 106]))
  );

  const assets = await serially(promises);

  return assets.filter(notNullOrUndefined);
};

export const fetchRequiredAssetsByCodename = async (
  client: ManagementClient,
  assetCodenames: ReadonlyArray<string>,
) => {
  const promises = assetCodenames.map(codename => () =>
    client
      .viewAsset()
      .byAssetCodename(codename)
      .toPromise()
      .then(res => res.data._raw)
      .catch(skipKontentErrors([105, 106]))
  );

  const assets = await serially(promises);

  return assets.filter(notNullOrUndefined);
};

export const fetchRequiredContentItems = async (client: ManagementClient, itemsIds: ReadonlyArray<string>) => {
  const promises = itemsIds.map(id => () =>
    client
      .viewContentItem()
      .byItemId(id)
      .toPromise()
      .then(res => res.data._raw)
      .catch(skipKontentErrors([100]))
  );

  const items = await serially(promises);
  return items.filter(notNullOrUndefined);
};

export const fetchRequiredContentItemsByCodename = async (
  client: ManagementClient,
  itemCodenames: ReadonlyArray<string>,
) => {
  const promises = itemCodenames.map(codename => () =>
    client
      .viewContentItem()
      .byItemCodename(codename)
      .toPromise()
      .then(res => res.data._raw)
      .catch(skipKontentErrors([100]))
  );

  const items = await serially(promises);
  return items.filter(notNullOrUndefined);
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
