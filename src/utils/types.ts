import { SharedContracts } from "@kontent-ai/management-sdk";

export type MapValues<Map extends ReadonlyMap<unknown, unknown>> = Map extends ReadonlyMap<unknown, infer Res> ? Res
  : never;

export type IdReference = Readonly<{ id: string }>;
export type CodenameReference = Readonly<{ codename: string }>;

/**
 * Use this to replace inaccurate references for better ones in SDK types returned from MAPI.
 *
 * @example ReplaceReferences<LanguageVariantContracts.ILanguageVariantModel>
 *
 * @example ReplaceReferences<LanguageVariantContracts.ILanguageVariantModel, MyBetterReference>
 */
export type ReplaceReferences<T, R extends IdReference | CodenameReference = IdReference> = T extends object ? {
    [K in keyof T]: T[K] extends SharedContracts.IReferenceObjectContract
      ? SharedContracts.IReferenceObjectContract extends T[K] ? R : ReplaceReferences<T[K], R>
      : ReplaceReferences<T[K], R>;
  }
  : T;

export type RequiredId<T extends { [key in "id"]?: string }> = Replace<T, "id", string>;
export type RequiredCodename<T extends { [key in "codename"]?: string }> = Replace<T, "codename", string>;

export type Replace<T, Key extends keyof T, NewType, IsOptional extends boolean = false> =
  & Omit<T, Key>
  & (IsOptional extends true ? { readonly [key in Key]?: NewType } : { readonly [key in Key]: NewType });
