import { SharedContracts } from "@kontent-ai/management-sdk";

export type MapValues<Map extends ReadonlyMap<unknown, unknown>> = Map extends ReadonlyMap<unknown, infer Res> ? Res
  : never;

export type IdReference = Readonly<{ id: string }>;
export type CodenameReference = Readonly<{ codename: string }>;

/**
 * Use this to replace inaccurate references for better ones in SDK types returned from MAPI.
 *
 * @example FixReferences<LanguageVariantContracts.ILanguageVariantModel>
 *
 * @example FixReferences<LanguageVariantContracts.ILanguageVariantModel, MyBetterReference>
 */
export type FixReferences<T, R extends IdReference | CodenameReference = IdReference> = T extends object ? {
    [K in keyof T]: T[K] extends SharedContracts.IReferenceObjectContract
      ? SharedContracts.IReferenceObjectContract extends T[K] ? R : FixReferences<T[K], R>
      : FixReferences<T[K], R>;
  }
  : T;

export type RequiredId<T extends { [key in "id"]?: string }> = Replace<T, "id", string>;
export type RequiredCodename<T extends { [key in "codename"]?: string }> = Replace<T, "codename", string>;

export type Replace<T, Key extends keyof T, NewValue, IsOptional extends boolean = false> =
  & Omit<T, Key>
  & (IsOptional extends true ? { readonly [key in Key]?: NewValue } : { readonly [key in Key]: NewValue });
