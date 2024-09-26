import {
  AssetFolderContracts,
  CollectionContracts,
  ContentTypeContracts,
  ContentTypeElements,
  ContentTypeSnippetContracts,
  LanguageContracts,
  SpaceContracts,
  TaxonomyContracts,
  WebSpotlightContracts,
  WorkflowContracts,
} from "@kontent-ai/management-sdk";

import { CodenameReference, Replace } from "../../../utils/types.js";

type ReplaceReferences<T, Reference extends CodenameReference = CodenameReference> = T extends ReadonlyArray<infer R>
  ? ReadonlyArray<ReplaceReferences<R>>
  : T extends object ?
      & (T extends { id?: string; codename?: string; external_id?: string } ? Reference
        : object)
      & {
        [K in keyof Omit<T, "id" | "codename" | "external_id">]: ReplaceReferences<T[K]>;
      }
  : T;

type SnippetElement<E> = Omit<E, "content_group">;
// content item or asset reference
export type ContentReference = {
  readonly global: { readonly value: ReadonlyArray<Readonly<{ codename: string; external_id: string }>> };
};

export type SyncCustomElement = ReplaceReferences<ContentTypeElements.ICustomElement>;
export type SyncMultipleChoiceElement = ReplaceReferences<ContentTypeElements.IMultipleChoiceElement>;
export type SyncAssetElement = Replace<
  ReplaceReferences<ContentTypeElements.IAssetElement>,
  { default?: ContentReference }
>;

type OnePropRequired<T, K extends keyof T = keyof T> = K extends any
  ? { [P in Exclude<keyof T, K>]?: T[P] } & { [P in K]: T[K] }
  : never;

export type SyncRichTextElement = ReplaceReferences<ContentTypeElements.IRichTextElement>;
export type SyncTaxonomyElement = Replace<ReplaceReferences<ContentTypeElements.ITaxonomyElement>, {
  name: string;
  taxonomy_group: OnePropRequired<{
    codename: string;
    external_id: string;
  }>;
}>;

export type SyncLinkedItemsElement = Replace<
  ReplaceReferences<ContentTypeElements.ILinkedItemsElement>,
  { default?: ContentReference }
>;
export type SyncGuidelinesElement = ReplaceReferences<ContentTypeElements.IGuidelinesElement>;
export type SyncTextElement = ReplaceReferences<ContentTypeElements.ITextElement>;
export type SyncDateTimeElement = ReplaceReferences<ContentTypeElements.IDateTimeElement>;
export type SyncNumberElement = ReplaceReferences<ContentTypeElements.INumberElement>;
export type SyncTypeSnippetElement = ReplaceReferences<ContentTypeElements.ISnippetElement>;
export type SyncUrlSlugElement = ReplaceReferences<ContentTypeElements.IUrlSlugElement>;
export type SyncSubpagesElement =
  & ReplaceReferences<ContentTypeElements.ISubpagesElement>
  & Pick<SyncLinkedItemsElement, "default">; // The property is missing in the SDK type

export type SyncSnippetCustomElement = SnippetElement<SyncCustomElement>;
export type SyncSnippetMultipleChoiceElement = SnippetElement<SyncMultipleChoiceElement>;
export type SyncSnippetAssetElement = SnippetElement<SyncAssetElement>;
export type SyncSnippetRichTextElement = SnippetElement<SyncRichTextElement>;
export type SyncSnippetTaxonomyElement = SnippetElement<SyncTaxonomyElement>;
export type SyncSnippetLinkedItemsElement = SnippetElement<SyncLinkedItemsElement>;
export type SyncSnippetGuidelinesElement = SnippetElement<SyncGuidelinesElement>;
export type SyncSnippetTextElement = SnippetElement<SyncTextElement>;
export type SyncSnippetDateTimeElement = SnippetElement<SyncDateTimeElement>;
export type SyncSnippetNumberElement = SnippetElement<SyncNumberElement>;

export type SyncSnippetElement =
  | SyncSnippetCustomElement
  | SyncSnippetMultipleChoiceElement
  | SyncSnippetAssetElement
  | SyncSnippetRichTextElement
  | SyncSnippetTaxonomyElement
  | SyncSnippetLinkedItemsElement
  | SyncSnippetGuidelinesElement
  | SyncSnippetTextElement
  | SyncSnippetNumberElement
  | SyncSnippetDateTimeElement;

export type SyncTypeElement =
  | SyncAssetElement
  | SyncCustomElement
  | SyncDateTimeElement
  | SyncGuidelinesElement
  | SyncLinkedItemsElement
  | SyncMultipleChoiceElement
  | SyncNumberElement
  | SyncRichTextElement
  | SyncSubpagesElement
  | SyncTaxonomyElement
  | SyncTextElement
  | SyncTypeSnippetElement
  | SyncUrlSlugElement;

export type TaxonomySyncModel = Replace<
  Omit<TaxonomyContracts.ITaxonomyContract, "id" | "last_modified" | "external_id">,
  Readonly<{ codename: string; terms: ReadonlyArray<TaxonomySyncModel> }>
>;

export type ContentTypeSnippetsSyncModel = Replace<
  Omit<ContentTypeSnippetContracts.IContentTypeSnippetContract, "id" | "last_modified" | "external_id">,
  Readonly<{
    codename: string;
    elements: ReadonlyArray<SyncSnippetElement>;
  }>
>;

export type ContentTypeSyncModel = Replace<
  Omit<ContentTypeContracts.IContentTypeContract, "id" | "last_modified" | "external_id">,
  Readonly<{
    codename: string;
    elements: ReadonlyArray<Replace<SyncTypeElement, { codename: string }>>;
    content_groups?: ReadonlyArray<Replace<ContentTypeContracts.IContentTypeGroup, { codename: string }>>;
  }>
>;

export type WebSpotlightSyncModel = Replace<
  WebSpotlightContracts.IWebSpotlightStatus,
  { root_type: Readonly<{ codename: string }> | null }
>;

export type CollectionSyncModel = Omit<CollectionContracts.ICollectionContract, "id">;

export type AssetFolderSyncModel = Replace<
  Omit<AssetFolderContracts.IAssetFolderContract, "id" | "external_id">,
  Readonly<{ folders: ReadonlyArray<AssetFolderSyncModel> }>
>;

export type SpaceSyncModel = Replace<
  Omit<SpaceContracts.ISpaceContract, "id">,
  Readonly<{
    web_spotlight_root_item?: Readonly<{ codename: string }>;
    collections: ReadonlyArray<Readonly<{ codename: string }>>;
  }>
>;

export type LanguageSyncModel = Replace<
  Omit<LanguageContracts.ILanguageModelContract, "id" | "external_id">,
  Readonly<{ fallback_language?: CodenameReference }>
>;

// scheduled_step exists only in GET according to docs
export type WorkflowSyncModel = Replace<
  Omit<WorkflowContracts.IWorkflowContract, "id" | "scheduled_step">,
  Readonly<{
    scopes: Array<ScopeSyncModel>;
    steps: WorkflowStepSyncModel[];
    published_step: Omit<WorkflowContracts.IWorkflowPublishedStepContract, "id">;
    archived_step: Omit<WorkflowContracts.IWorkflowArchivedStepContract, "id">;
  }>
>;

type ScopeSyncModel = {
  content_types: Array<CodenameReference>;
  collections: Array<CodenameReference>;
};

export type WorkflowStepSyncModel = Replace<
  Omit<WorkflowContracts.IWorkflowStepNewContract, "id">,
  Readonly<{ transitions_to: Array<{ step: CodenameReference }> }>
>;

export const isSyncCustomElement = (entity: unknown): entity is SyncCustomElement =>
  typeof entity === "object" && entity !== null && "type" in entity && entity.type === "custom";

export const isSyncUrlSlugElement = (entity: unknown): entity is SyncUrlSlugElement =>
  typeof entity === "object" && entity !== null && "type" in entity && entity.type === "url_slug";
