import {
  ContentTypeContracts,
  ContentTypeSnippetContracts,
  ElementContracts,
  TaxonomyContracts,
} from "@kontent-ai/management-sdk";

import { CodenameReference, FixReferences } from "../../../utils/types.js";

export type TaxonomyContract =
  & Omit<TaxonomyContracts.ITaxonomyContract, "id" | "last_modified" | "codename" | "terms">
  & {
    codename: string;
    terms: TaxonomyContract[];
  };

export type ContentTypeSnippetsContract =
  & Omit<ContentTypeSnippetContracts.IContentTypeSnippetContract, "id" | "codename" | "last_modified" | "elements">
  & { codename: string; elements: FixReferences<ElementContracts.IContentItemElementContract, CodenameReference>[] };

export type ContentTypeContract =
  & Omit<ContentTypeContracts.IContentTypeContract, "id" | "codename" | "last_modified" | "elements">
  & { codename: string; elements: FixReferences<ElementContracts.IContentItemElementContract, CodenameReference>[] };

export type FileContentModel = {
  taxonomyGroups: ReadonlyArray<TaxonomyContract>;
  contentTypeSnippets: ReadonlyArray<ContentTypeSnippetsContract>;
  contentTypes: ReadonlyArray<ContentTypeContract>;
};
