import {
  ContentTypeContracts,
  ContentTypeSnippetContracts,
  ElementContracts,
  TaxonomyContracts,
} from "@kontent-ai/management-sdk";

import { Replace } from "../../../utils/types.js";
import { SyncSnippetElement } from "./syncModel.js";

export type TaxonomySyncModel = Replace<
  Omit<TaxonomyContracts.ITaxonomyContract, "id" | "last_modified">,
  Readonly<{ codename: string; terms: ReadonlyArray<TaxonomySyncModel> }>
>;

export type ContentTypeSnippetsSyncModel = Replace<
  Omit<ContentTypeSnippetContracts.IContentTypeSnippetContract, "id" | "last_modified">,
  Readonly<{
    codename: string;
    elements: ReadonlyArray<SyncSnippetElement>;
  }>
>;

export type ContentTypeSyncModel = Replace<
  Omit<ContentTypeContracts.IContentTypeContract, "id" | "last_modified">,
  Readonly<{
    codename: string;
    elements: ReadonlyArray<Replace<ElementContracts.IContentTypeElementContract, { codename: string }>>;
    content_groups?: ReadonlyArray<Replace<ContentTypeContracts.IContentTypeGroup, { codename: string }>>;
  }>
>;

export type FileContentModel = Readonly<{
  taxonomyGroups: ReadonlyArray<TaxonomySyncModel>;
  contentTypeSnippets: ReadonlyArray<ContentTypeSnippetsSyncModel>;
  contentTypes: ReadonlyArray<ContentTypeSyncModel>;
}>;
