import {
  ContentTypeContracts,
  ContentTypeElements,
  ContentTypeSnippetContracts,
  TaxonomyContracts,
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

type SyncSnippetCustomElement = SnippetElement<SyncCustomElement>;
type SyncSnippetMultipleChoiceElement = SnippetElement<SyncMultipleChoiceElement>;
type SyncSnippetAssetElement = SnippetElement<SyncAssetElement>;
type SyncSnippetRichTextElement = SnippetElement<SyncRichTextElement>;
type SyncSnippetTaxonomyElement = SnippetElement<SyncTaxonomyElement>;
type SyncSnippetLinkedItemsElement = SnippetElement<SyncLinkedItemsElement>;
type SyncSnippetGuidelinesElement = SnippetElement<SyncGuidelinesElement>;
type SyncSnippetTextElement = SnippetElement<SyncTextElement>;
type SyncSnippetDateTimeElement = SnippetElement<SyncDateTimeElement>;
type SyncSnippetNumberElement = SnippetElement<SyncNumberElement>;

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

export const isSyncCustomElement = (entity: unknown): entity is SyncCustomElement =>
  typeof entity === "object" && entity !== null && "type" in entity && entity.type === "custom";

export const isSyncUrlSlugElement = (entity: unknown): entity is SyncUrlSlugElement =>
  typeof entity === "object" && entity !== null && "type" in entity && entity.type === "url_slug";
