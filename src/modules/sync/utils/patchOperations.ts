// TODO: This file is just a suggestion. Feel free to come up with your idea :)
// The definitions are here for the suggestion of the skeleton of the idea and might not be correct.

import { ContentTypeModels, ContentTypeSnippetModels, TaxonomyModels } from "@kontent-ai/management-sdk";

type PatchOperationType =
  | ContentTypeModels.IModifyContentTypeData
  | ContentTypeSnippetModels.IModifyContentTypeSnippetData
  | TaxonomyModels.IModifyTaxonomyData;

type ComposableHandler = <T extends Readonly<Record<string, unknown>>>(
  key: string,
  innerHandlers: { readonly [k in keyof T]: Handler<T[k]> },
) => Handler<T>;

type Handler<T> = (value: T) => PatchOperationType | null;

/**
 * This function might create a one big handler function for nested objects
 * consisting of multiple smaller handler function handling individual attributes
 */
const composeHandlers: ComposableHandler = () => {
  return () => {
    return null;
  };
};

composeHandlers as never;

export const handleName = (name: string) => ({
  op: "replace",
  path: "/name",
  value: name,
});

export const contentTypePropertyHandlers = {
  name: handleName,
};
