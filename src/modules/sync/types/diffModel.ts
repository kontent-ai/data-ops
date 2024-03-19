import { ContentTypeModels, ContentTypeSnippetModels, TaxonomyModels } from "@kontent-ai/management-sdk";

import { RequiredCodename } from "../../../utils/types.js";

type Codename = string;

type DiffObject<A, U> = Readonly<{
  added: ReadonlyArray<A>;
  updated: ReadonlyMap<Codename, ReadonlyArray<U>>;
  deleted: ReadonlyArray<Codename>;
}>;

export type DiffModel = Readonly<{
  taxonomyGroups: DiffObject<
    RequiredCodename<TaxonomyModels.IAddTaxonomyRequestModel>,
    TaxonomyModels.IModifyTaxonomyData
  >;
  contentTypeSnippets: DiffObject<
    RequiredCodename<ContentTypeSnippetModels.IAddContentTypeSnippetData>,
    ContentTypeSnippetModels.IModifyContentTypeSnippetData
  >;
  contentTypes: DiffObject<
    RequiredCodename<ContentTypeModels.IAddContentTypeData>,
    ContentTypeModels.IModifyContentTypeData
  >;
}>;
