import { ContentTypeModels, ContentTypeSnippetModels, TaxonomyModels } from "@kontent-ai/management-sdk";

import { RequiredCodename } from "../../../utils/types.js";
import { PatchOperation } from "./patchOperation.js";

type Codename = string;

export type DiffObject<AddModel> = Readonly<{
  added: ReadonlyArray<AddModel>;
  updated: ReadonlyMap<Codename, ReadonlyArray<PatchOperation>>;
  deleted: ReadonlySet<Codename>;
}>;

export type DiffModel = Readonly<{
  taxonomyGroups: DiffObject<RequiredCodename<TaxonomyModels.IAddTaxonomyRequestModel>>;
  contentTypeSnippets: DiffObject<RequiredCodename<ContentTypeSnippetModels.IAddContentTypeSnippetData>>;
  contentTypes: DiffObject<RequiredCodename<ContentTypeModels.IAddContentTypeData>>;
}>;
