import { ContentTypeElements } from "@kontent-ai/management-sdk";

export type ReplaceReferences<T> = T extends { id?: string; codename?: string; externalId?: string } ?
    & { codename: string }
    & {
      [K in keyof Omit<T, "id" | "codename">]: ReplaceReferences<T[K]>;
    }
  : T extends ReadonlyArray<infer R> ? ReadonlyArray<ReplaceReferences<R>>
  : T;

type SnippetElement<E> = Omit<E, "content_group">;
type ContentReference = { default?: { global: { value: { codename: string; external_id: string }[] } } };

export type SyncCustomElement = ReplaceReferences<ContentTypeElements.ICustomElement>;
export type SyncMultipleChoiceElement = ReplaceReferences<ContentTypeElements.IMultipleChoiceElement>;
export type SyncAssetElement =
  & Omit<ReplaceReferences<ContentTypeElements.IAssetElement>, "default">
  & ContentReference;
export type SyncRichTextElement = ReplaceReferences<ContentTypeElements.IRichTextElement>;
export type SyncTaxonomyElement = Omit<ReplaceReferences<ContentTypeElements.ITaxonomyElement>, "name"> & {
  name: string;
};
export type SyncLinkedItemsElement =
  & Omit<ReplaceReferences<ContentTypeElements.ILinkedItemsElement>, "default">
  & ContentReference;
export type SyncGuidelinesElement = ReplaceReferences<ContentTypeElements.IGuidelinesElement>;

export type SyncSnippetCustomElement = SnippetElement<SyncCustomElement>;
export type SyncSnippetMultipleChoiceElement = SnippetElement<SyncMultipleChoiceElement>;
export type SyncSnippetAssetElement = SnippetElement<SyncAssetElement>;
export type SyncSnippetRichTextElement = SnippetElement<SyncRichTextElement>;
export type SyncSnippetTaxonomyElement = SnippetElement<SyncTaxonomyElement>;
export type SyncSnippetLinkedItemsElement = SnippetElement<SyncLinkedItemsElement>;
export type SyncSnippetGuidelinesElement = SnippetElement<SyncGuidelinesElement>;
