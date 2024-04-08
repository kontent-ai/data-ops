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

export type RequiredId<T extends { [key in "id"]?: string }> = Replace<T, { id: string }>;
export type RequiredCodename<T extends { [key in "codename"]?: string }> = Replace<T, { codename: string }>;

export type Replace<T, NewValues extends { [key in keyof T]?: unknown }> =
  & Omit<T, keyof NewValues>
  & Readonly<NewValues>;

/**
 * Original Pick type extended to work on Union type objects
 */
export type SuperiorPick<T, K extends keyof T> = T extends any ? {
    [P in K]: T[P];
  }
  : never;

/**
 * Original Omit type extended to work on Union type objects
 */
export type SuperiorOmit<T, K extends keyof any> = T extends any ? SuperiorPick<T, Exclude<keyof T, K>> : never;
