import { SharedContracts } from "@kontent-ai/management-sdk";

export type MapValues<Map extends ReadonlyMap<unknown, unknown>> = Map extends ReadonlyMap<unknown, infer Res> ? Res
  : never;

export type IdReference = Readonly<{ id: string }>;

/**
 * Use this to replace inaccurate references for better ones in SDK types returned from MAPI.
 *
 * @example FixReferences<LanguageVariantContracts.ILanguageVariantModel>
 */
export type FixReferences<T> = T extends object ? {
    [K in keyof T]: T[K] extends SharedContracts.IReferenceObjectContract
      ? SharedContracts.IReferenceObjectContract extends T[K] ? IdReference : FixReferences<T[K]>
      : FixReferences<T[K]>;
  }
  : T;

export type RequiredId<T extends { [key in "id"]?: string }> = Replace<T, "id", string>;

export type Replace<T, Key extends keyof T, NewValue, IsOptional extends boolean = false> =
  & Omit<T, Key>
  & (IsOptional extends true ? { readonly [key in Key]?: NewValue } : { readonly [key in Key]: NewValue });

export type ExtractSelfId<T> = T extends ReadonlyMap<string, infer U>
  ? U extends { selfId: infer V } ? ReadonlyMap<string, V>
  : T
  : T;
