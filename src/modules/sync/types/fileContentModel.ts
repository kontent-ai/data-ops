import {
  ContentTypeContracts,
  ContentTypeSnippetContracts,
  ElementContracts,
  TaxonomyContracts,
} from "@kontent-ai/management-sdk";

import { CodenameReference, ReplaceReferences } from "../../../utils/types.js";

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
    elements: ReadonlyArray<ReplaceReferences<ElementContracts.IContentItemElementContract, CodenameReference>>;
  }>;

export type ContentTypeSyncModel =
  & Omit<ContentTypeContracts.IContentTypeContract, "id" | "codename" | "last_modified" | "elements">
  & Readonly<{
    codename: string;
    elements: ReadonlyArray<ReplaceReferences<ElementContracts.IContentItemElementContract, CodenameReference>>;
  }>;

export type FileContentModel = Readonly<{
  taxonomyGroups: ReadonlyArray<TaxonomySyncModel>;
  contentTypeSnippets: ReadonlyArray<ContentTypeSnippetsSyncModel>;
  contentTypes: ReadonlyArray<ContentTypeSyncModel>;
}>;
