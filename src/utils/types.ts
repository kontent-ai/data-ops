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

/**
 * Extracts a transformed `ReadonlyMap` where the values are simplified to the `selfId` property
 * of the objects if available. Otherwise returns the type as is.
 *
 * @template T - The type to transform, e.g. `ReadonlyMap<string, object>`.
 * @returns A `ReadonlyMap` keyed similarly but with values as the `selfId` of the objects,
 *          or the original type `T` if `T` is not a `ReadonlyMap` or the objects don't have `selfId`.
 */
export type ExtractSelfId<T> = T extends ReadonlyMap<string, infer U>
  ? U extends { selfId: infer V } ? ReadonlyMap<string, V>
  : T
  : T;

export type Transformable<T> = T extends object ?
    & {
      [P in keyof T]: Transformable<T[P]>;
    }
    & { [index: string]: Transformable<any> }
  : T;
