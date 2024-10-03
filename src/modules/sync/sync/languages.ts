import { LanguageModels, ManagementClient } from "@kontent-ai/management-sdk";
import { oraPromise } from "ora";
import { match } from "ts-pattern";
import { v4 as createUuid } from "uuid";
import { z } from "zod";

import { logInfo, LogOptions } from "../../../log.js";
import { omit } from "../../../utils/object.js";
import { serially } from "../../../utils/requests.js";
import { noSyncTaskEmoji } from "../constants/emojiCodes.js";
import { DiffModel } from "../types/diffModel.js";
import { PatchOperation } from "../types/patchOperation.js";

export const syncLanguages = async (
  client: ManagementClient,
  operations: DiffModel["languages"],
  logOptions: LogOptions,
) => {
  if (operations.added.length) {
    await oraPromise(serially(operations.added.filter(op => !op.is_default).map(l => () => addLanguage(client, l))), {
      text: "Adding languages",
    });
  } else {
    logInfo(logOptions, "standard", `${noSyncTaskEmoji}No languages to add`);
  }

  if ([...operations.updated].flatMap(([, arr]) => arr).length) {
    const transformedOperations = [...operations.updated].map(
      ([codename, operations]) => [codename, operations.map(transformLanguagePatchOperation)] as const,
    );

    const sortedOperations = transformedOperations.toSorted(([, operations], [, operations2]) =>
      operationsToOrdNumb(operations) - operationsToOrdNumb(operations2)
    );

    await oraPromise(
      serially(
        sortedOperations.map(([codename, operations]) => () => modifyLanguage(client, codename, operations)),
      ),
      { text: "Updating Languages" },
    );
  } else {
    logInfo(logOptions, "standard", `${noSyncTaskEmoji} No languages to update`);
  }

  if (operations.deleted.size) {
    await oraPromise(
      serially(
        [...operations.deleted].map(codename => () => deleteLanguage(client, codename)),
      ),
      { text: "Deactivating languages" },
    );
  } else {
    logInfo(logOptions, "standard", `${noSyncTaskEmoji} No languages to deactivate`);
  }
};

const addLanguage = (client: ManagementClient, langauge: LanguageModels.IAddLanguageData) =>
  client
    .addLanguage()
    .withData(langauge)
    .toPromise();

const modifyLanguage = (
  client: ManagementClient,
  codename: string,
  operations: LanguageModels.IModifyLanguageData[],
) =>
  client
    .modifyLanguage()
    .byLanguageCodename(codename)
    .withData(operations)
    .toPromise();

const deleteLanguage = (client: ManagementClient, codename: string) => {
  const randomUuid = createUuid();
  return client
    .modifyLanguage()
    .byLanguageCodename(codename).withData([
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
    ]).toPromise();
};

const transformLanguagePatchOperation = (operation: PatchOperation): LanguageModels.IModifyLanguageData =>
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

const operationsToOrdNumb = (operations: LanguageModels.IModifyLanguageData[]) =>
  operations.find(op => op.property_name === "codename") !== undefined ? 0 : 100;
