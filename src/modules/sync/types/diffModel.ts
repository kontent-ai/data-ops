import {
  ContentTypeModels,
  ContentTypeSnippetModels,
  LanguageModels,
  SharedContracts,
  SpaceModels,
  TaxonomyModels,
} from "@kontent-ai/management-sdk";

import { Replace, RequiredCodename } from "../../../utils/types.js";
import { PatchOperation } from "./patchOperation.js";

type Codename = string;

export type DiffObject<AddModel> = Readonly<{
  added: ReadonlyArray<AddModel>;
  updated: ReadonlyMap<Codename, ReadonlyArray<PatchOperation>>;
  deleted: ReadonlySet<Codename>;
}>;

export type WebSpotlightDiffModel = Readonly<
  | { change: "none" }
  | { change: "activate"; rootTypeCodename: Codename }
  | { change: "changeRootType"; rootTypeCodename: Codename }
  | { change: "deactivate" }
>;

export type DiffModel = Readonly<{
  taxonomyGroups: DiffObject<RequiredCodename<TaxonomyModels.IAddTaxonomyRequestModel>>;
  contentTypeSnippets: DiffObject<RequiredCodename<ContentTypeSnippetModels.IAddContentTypeSnippetData>>;
  contentTypes: DiffObject<RequiredCodename<ContentTypeModels.IAddContentTypeData>>;
  collections: ReadonlyArray<PatchOperation>;
  webSpotlight: WebSpotlightDiffModel;
  assetFolders: ReadonlyArray<PatchOperation>;
  spaces: DiffObject<
    Replace<
      RequiredCodename<SpaceModels.IAddSpaceData>,
      { collections: ReadonlyArray<SharedContracts.IReferenceObjectContract> }
    >
  >;
  languages: DiffObject<RequiredCodename<LanguageModels.IAddLanguageData> & Readonly<{ is_default: boolean }>>;
}>;
