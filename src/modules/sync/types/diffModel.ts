import type {
  ContentTypeModels,
  ContentTypeSnippetModels,
  LanguageModels,
  SharedContracts,
  SpaceModels,
  TaxonomyModels,
  WorkflowModels,
} from "@kontent-ai/management-sdk";

import type { Replace, RequiredCodename } from "../../../utils/types.js";
import type { PatchOperation } from "./patchOperation.js";

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
  contentTypeSnippets: DiffObject<
    RequiredCodename<ContentTypeSnippetModels.IAddContentTypeSnippetData>
  >;
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
  languages: DiffObject<
    RequiredCodename<LanguageModels.IAddLanguageData> & Readonly<{ is_default: boolean }>
  >;
  workflows: DiffObject<RequiredCodename<WorkflowModels.IAddWorkflowData>> & {
    sourceWorkflows: ReadonlyArray<WorkflowModels.IAddWorkflowData>;
  };
}>;
