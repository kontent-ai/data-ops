import type { LanguageModels, ManagementClient } from "@kontent-ai/management-sdk";
import { match } from "ts-pattern";
import { v4 as createUuid } from "uuid";
import { z } from "zod";

import { type LogOptions, logInfo } from "../../../log.js";
import { omit } from "../../../utils/object.js";
import { serially } from "../../../utils/requests.js";
import type { DiffModel } from "../types/diffModel.js";
import type { PatchOperation } from "../types/patchOperation.js";
import { sortLanguagesByFallback } from "./languageFallbackSort.js";

export const syncLanguages = async (
  client: ManagementClient,
  operations: DiffModel["languages"],
  logOptions: LogOptions,
) => {
  const transformedUpdates = [...operations.updated]
    .map(([codename, ops]) => [codename, ops.map(transformLanguagePatchOperation)] as const)
    .filter(([, ops]) => ops.length > 0);

  // Codename renames must happen before adding new languages, so that fallback_language
  // references resolve correctly. Other operations for the same language (e.g. fallback_language
  // pointing to a language being added) must happen after adds, using the new codename.
  const preAddUpdates = transformedUpdates.flatMap(([codename, ops]) => {
    const codenameOp = ops.find((op) => op.property_name === "codename");
    return codenameOp ? [[codename, [codenameOp]] as const] : [];
  });

  const postAddUpdates = transformedUpdates.flatMap(([codename, ops]) => {
    const codenameOp = ops.find((op) => op.property_name === "codename");
    if (!codenameOp) {
      return [[codename, ops] as const];
    }
    const newCodename = codenameOp.value as string;
    const remainingOps = ops.filter((op) => op.property_name !== "codename");
    return remainingOps.length > 0 ? [[newCodename, remainingOps] as const] : [];
  });

  if (preAddUpdates.length) {
    logInfo(logOptions, "standard", "Updating default language");
    await serially(
      preAddUpdates.map(
        ([codename, ops]) =>
          () =>
            modifyLanguage(client, codename, [...ops]),
      ),
    );
  }

  const languagesToAdd = operations.added.filter((op) => !op.is_default);
  const { sorted, deferredFallbackUpdates } = sortLanguagesByFallback(
    languagesToAdd,
    operations.sourceDefaultLanguageCodename,
  );

  if (sorted.length) {
    logInfo(logOptions, "standard", "Adding languages");
    await serially(sorted.map((l) => () => addLanguage(client, l)));
  } else {
    logInfo(logOptions, "standard", "No languages to add");
  }

  if (deferredFallbackUpdates.length) {
    logInfo(logOptions, "standard", "Fixing fallback languages after cycle breaking");
    await serially(
      deferredFallbackUpdates.map(
        ({ codename, fallback_language }) =>
          () =>
            modifyLanguage(client, codename, [
              {
                op: "replace",
                property_name: "fallback_language",
                value: fallback_language,
              },
            ]),
      ),
    );
  }

  if (postAddUpdates.length) {
    logInfo(logOptions, "standard", "Updating languages");
    await serially(
      postAddUpdates.map(
        ([codename, ops]) =>
          () =>
            modifyLanguage(client, codename, ops),
      ),
    );
  } else if (!preAddUpdates.length) {
    logInfo(logOptions, "standard", "No languages to update");
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
