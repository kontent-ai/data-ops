import { ContentTypeModels, ContentTypeSnippetModels, TaxonomyModels } from "@kontent-ai/management-sdk";

import { RequiredCodename } from "../../../utils/types.js";

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

export type PatchOperation =
  | Readonly<{
    op: "addInto";
    path: string;
    value: unknown;
    before?: { codename: string };
    after?: { codename: string };
  }>
  | Readonly<{
    op: "remove";
    path: string;
    oldValue: unknown;
  }>
  | Readonly<{
    op: "replace";
    path: string;
    value: unknown;
    oldValue: unknown;
  }>
  | (
    & Readonly<{
      op: "move";
      path: string;
    }>
    & ({ readonly before: { readonly codename: string } } | { readonly after: { readonly codename: string } })
  );
