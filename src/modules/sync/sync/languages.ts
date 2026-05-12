import type { LanguageModels, ManagementClient, SharedModels } from "@kontent-ai/management-sdk";
import { match } from "ts-pattern";
import { v4 as createUuid } from "uuid";
import { z } from "zod";

import { type LogOptions, logInfo } from "../../../log.js";
import { omit } from "../../../utils/object.js";
import { serially } from "../../../utils/requests.js";
import type { DiffModel } from "../types/diffModel.js";
import type { PatchOperation } from "../types/patchOperation.js";

export const syncLanguages = async (
  client: ManagementClient,
  operations: DiffModel["languages"],
  logOptions: LogOptions,
) => {
  const inactiveTargets = operations.inactiveTargetLanguageCodenames;

  const splitUpdates = [...operations.updated].map(([codename, ops]) => {
    const transformed = ops.map(transformLanguagePatchOperation);
    const fallbackOp = transformed.find((op) => op.property_name === "fallback_language");
    const nonFallbackOps = transformed.filter((op) => op.property_name !== "fallback_language");
    const codenameOp = transformed.find((op) => op.property_name === "codename");
    const isActiveOp = transformed.find((op) => op.property_name === "is_active");
    const updatedCodename = typeof codenameOp?.value === "string" ? codenameOp.value : codename;
    const isCurrentlyActive = !inactiveTargets.has(codename);
    // When is_active is in the diff, its value is the source state; otherwise target === source.
    const sourceIsActive =
      typeof isActiveOp?.value === "boolean" ? isActiveOp.value : isCurrentlyActive;
    return {
      codename,
      updatedCodename,
      nonFallbackOps,
      fallbackOp,
      isCurrentlyActive,
      sourceIsActive,
    };
  });

  const nonFallbackUpdates = splitUpdates.filter((u) => u.nonFallbackOps.length > 0);
  if (nonFallbackUpdates.length) {
    logInfo(logOptions, "standard", "Updating languages");
    await serially(
      nonFallbackUpdates.map(
        (u) => () =>
          modifyLanguage(
            client,
            u.codename,
            withActiveGuard(u.nonFallbackOps, u.isCurrentlyActive, u.sourceIsActive),
          ),
      ),
    );
  }

  if (operations.added.length) {
    logInfo(logOptions, "standard", "Adding languages");
    await serially(
      operations.added.map((l) => () => addLanguage(client, omit(l, ["fallback_language"]))),
    );
  } else {
    logInfo(logOptions, "standard", "No languages to add");
  }

  const newLangFallbackOps = operations.added.flatMap((l) =>
    l.fallback_language
      ? [
          {
            codename: l.codename,
            op: createReplaceFallbackOperation(l.fallback_language),
            isActive: l.is_active ?? true,
          },
        ]
      : [],
  );
  const existingLangFallbackOps = splitUpdates.flatMap((u) =>
    u.fallbackOp
      ? [{ codename: u.updatedCodename, op: u.fallbackOp, isActive: u.sourceIsActive }]
      : [],
  );
  const fallbackUpdates = [...newLangFallbackOps, ...existingLangFallbackOps];
  if (fallbackUpdates.length) {
    logInfo(logOptions, "standard", "Setting language fallbacks");
    await serially(
      fallbackUpdates.map(
        ({ codename, op, isActive }) =>
          () =>
            modifyLanguage(client, codename, withActiveGuard([op], isActive, isActive)),
      ),
    );
  }

  if (operations.deleted.size) {
    logInfo(logOptions, "standard", "Deactivating languages");
    await serially(
      [...operations.deleted].map((codename) => () => deleteLanguage(client, codename)),
    );
  } else {
    logInfo(logOptions, "standard", "No languages to deactivate");
  }
};

/**
 * MAPI rejects modify calls on inactive languages. Prepend an activation when the lang is
 * currently inactive and append a deactivation when it should end inactive. Any is_active op
 * already in the batch is dropped so this helper alone owns the toggling.
 */
const withActiveGuard = (
  ops: ReadonlyArray<LanguageModels.IModifyLanguageData>,
  isCurrentlyActive: boolean,
  shouldEndActive: boolean,
): LanguageModels.IModifyLanguageData[] => {
  const withoutIsActive = ops.filter((op) => op.property_name !== "is_active");
  const prefix = isCurrentlyActive ? [] : [createReplaceIsActiveOperation(true)];
  const suffix = shouldEndActive ? [] : [createReplaceIsActiveOperation(false)];
  return [...prefix, ...withoutIsActive, ...suffix];
};

const addLanguage = (client: ManagementClient, langauge: LanguageModels.IAddLanguageData) =>
  client.addLanguage().withData(langauge).toPromise();

const modifyLanguage = (
  client: ManagementClient,
  codename: string,
  operations: LanguageModels.IModifyLanguageData[],
) => client.modifyLanguage().byLanguageCodename(codename).withData(operations).toPromise();

const deleteLanguage = (client: ManagementClient, codename: string) => {
  const randomUuid = createUuid();
  return client
    .modifyLanguage()
    .byLanguageCodename(codename)
    .withData([
      /**
       * languages cannot be deleted, instead they are deactivated
       * and their name and codename are both populated with first 8 chars random uuid
       * (name and codename have a limit of 25 characters).
       *
       * only active languages can be modified.
       */
      createReplaceIsActiveOperation(true),
      createReplaceCodenameOperation(randomUuid.slice(0, 7)),
      createReplaceNameOperation(randomUuid.slice(0, 7)),
      createReplaceIsActiveOperation(false),
    ])
    .toPromise();
};

const transformLanguagePatchOperation = (
  operation: PatchOperation,
): LanguageModels.IModifyLanguageData =>
  match(operation)
    .returnType<LanguageModels.IModifyLanguageData>()
    .with({ op: "replace" }, (op) => {
      const splittedPath = op.path.split("/");
      const propertyName = splittedPath[splittedPath.length - 1];

      return languagePatchOperationSchema.parse({
        ...omit(op, ["oldValue", "path"]),
        property_name: propertyName,
      });
    })
    .otherwise(() => {
      throw new Error("Languages does not support any other than `replace` patch operations");
    });

const languagePatchOperationSchema = z.union([
  z.object({
    op: z.literal("replace"),
    property_name: z.literal("name"),
    value: z.string(),
  }),
  z.object({
    op: z.literal("replace"),
    property_name: z.literal("is_active"),
    value: z.boolean(),
  }),
  z.object({
    op: z.literal("replace"),
    property_name: z.literal("fallback_language"),
    value: z.object({
      codename: z.string(),
    }),
  }),
  z.object({
    op: z.literal("replace"),
    property_name: z.literal("codename"),
    value: z.string(),
  }),
]);

const createReplaceCodenameOperation = (codename: string): LanguageModels.IModifyLanguageData => ({
  op: "replace",
  property_name: "codename",
  value: codename,
});

const createReplaceNameOperation = (name: string): LanguageModels.IModifyLanguageData => ({
  op: "replace",
  property_name: "name",
  value: name,
});

const createReplaceIsActiveOperation = (isActive: boolean): LanguageModels.IModifyLanguageData => ({
  op: "replace",
  property_name: "is_active",
  value: isActive,
});

const createReplaceFallbackOperation = (
  fallbackLanguage: SharedModels.IReferenceObject,
): LanguageModels.IModifyLanguageData => ({
  op: "replace",
  property_name: "fallback_language",
  value: fallbackLanguage,
});
