import {
  ContentTypeContracts,
  ContentTypeSnippetContracts,
  ElementContracts,
  TaxonomyContracts,
} from "@kontent-ai/management-sdk";

import { Replace } from "../../../utils/types.js";
import { SyncSnippetElement } from "./syncModel.js";

export type TaxonomySyncModel =
  & Omit<TaxonomyContracts.ITaxonomyContract, "id" | "last_modified" | "codename" | "terms">
  & Readonly<{
    codename: string;
    terms: ReadonlyArray<TaxonomySyncModel>;
  }>;

export type ContentTypeSnippetsSyncModel =
  & Omit<ContentTypeSnippetContracts.IContentTypeSnippetContract, "id" | "codename" | "last_modified" | "elements">
  & Readonly<{
    codename: string;
    elements: ReadonlyArray<SyncSnippetElement>;
  }>;

export type ContentTypeSyncModel =
  & Omit<ContentTypeContracts.IContentTypeContract, "id" | "codename" | "last_modified" | "elements" | "content_groups">
  & Readonly<{
    codename: string;
    elements: ReadonlyArray<Replace<ElementContracts.IContentTypeElementContract, "codename", string>>;
    content_groups?: ReadonlyArray<Replace<ContentTypeContracts.IContentTypeGroup, "codename", string>>;
  }>;

export type FileContentModel = Readonly<{
  taxonomyGroups: ReadonlyArray<TaxonomySyncModel>;
  contentTypeSnippets: ReadonlyArray<ContentTypeSnippetsSyncModel>;
  contentTypes: ReadonlyArray<ContentTypeSyncModel>;
}>;
