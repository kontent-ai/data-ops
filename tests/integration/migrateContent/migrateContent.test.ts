import { config as dotenvConfig } from "dotenv";
import * as fsPromises from "fs/promises";
import { describe, expect, it } from "vitest";

import { migrateContentRun } from "../../../src/public.ts";
import { expectSameAllEnvData, prepareReferences } from "../importExport/utils/compare.ts";
import { AllEnvData, loadAllEnvData, loadVariantsByItemCodename } from "../importExport/utils/envData.ts";
import { runCommand } from "../utils/runCommand.ts";
import { withTestEnvironment } from "../utils/setup.ts";

dotenvConfig();

const { SYNC_SOURCE_TEST_ENVIRONMENT_ID, API_KEY, SYNC_TARGET_TEST_ENVIRONMENT_ID, DELIVERY_KEY } = process.env;

if (!API_KEY) {
  throw new Error("API_KEY env variable was not provided.");
}
if (!SYNC_SOURCE_TEST_ENVIRONMENT_ID) {
  throw new Error("SYNC_SOURCE_TEST_ENVIRONMENT_ID environment variable is not defined.");
}
if (!SYNC_TARGET_TEST_ENVIRONMENT_ID) {
  throw new Error("SYNC_TARGET_TEST_ENVIRONMENT_ID env variable was not provided.");
}

if (!DELIVERY_KEY) {
  throw new Error("DELIVERY_KEY env variable was not provided.");
}

const language = "static_lang";

const expectSameSyncContentEnvironments = async (
  environmentId1: string,
  environmentId2: string,
  itemCodenames: ReadonlyArray<string>,
): Promise<void> => {
  const loadLanguageVariants = async (envData: AllEnvData, environment: string) => {
    const lang = envData.languages.find(l => l.codename === language);

    if (!lang) {
      throw new Error(`Could not find required language with codename "${language}"`);
    }

    return {
      ...(await loadVariantsByItemCodename(environment, itemCodenames, lang.id)),
      types: envData.types,
    };
  };

  const data1 = await loadAllEnvData(environmentId1, { include: ["types", "languages"] })
    .then(res => loadLanguageVariants(res, environmentId1))
    .then(prepareReferences);
  const data2 = await loadAllEnvData(environmentId2, { include: ["types", "languages"] })
    .then(res => loadLanguageVariants(res, environmentId2))
    .then(prepareReferences);

  expectSameAllEnvData(data1, data2, { include: ["variants"] });
};

describe.concurrent("Migrate content between two environments with credentials", () => {
  it.concurrent(
    "migrate-content source environment to target environment without linked item",
    withTestEnvironment(SYNC_TARGET_TEST_ENVIRONMENT_ID, async (environmentId) => {
      const command =
        `migrate-content run -s=${SYNC_SOURCE_TEST_ENVIRONMENT_ID} --sk=${API_KEY} -t=${environmentId} --tk=${API_KEY} -l=${language} --items sync_item_1 --verbose --skipConfirmation`;

      await runCommand(command);

      await expectSameSyncContentEnvironments(environmentId, SYNC_SOURCE_TEST_ENVIRONMENT_ID, ["sync_item_1"]);
    }),
  );

  it.concurrent(
    "Migrate content from source environment to target environment directly from source environment with linked item using API",
    withTestEnvironment(SYNC_TARGET_TEST_ENVIRONMENT_ID, async (environmentId) => {
      await migrateContentRun({
        sourceEnvironmentId: SYNC_SOURCE_TEST_ENVIRONMENT_ID,
        sourceApiKey: API_KEY,
        targetEnvironmentId: environmentId,
        targetApiKey: API_KEY,
        language,
        sourceDeliveryPreviewKey: DELIVERY_KEY,
        items: ["sync_item_1"],
        depth: 2,
        verbose: true,
      });

      await expectSameSyncContentEnvironments(environmentId, SYNC_SOURCE_TEST_ENVIRONMENT_ID, [
        "sync_item_1",
        "sync_linked_item_1",
      ]);
    }),
  );

  it.concurrent(
    "Migrate content from source environment to target environment directly from source environment get item byContentType with linked item",
    withTestEnvironment(SYNC_TARGET_TEST_ENVIRONMENT_ID, async (environmentId) => {
      const command =
        `migrate-content run -s=${SYNC_SOURCE_TEST_ENVIRONMENT_ID} --sk=${API_KEY} -t=${environmentId} --tk=${API_KEY} --sd=${DELIVERY_KEY} -l=${language} --byTypesCodenames no_change_linked_type no_change_base_type --verbose --skipConfirmation`;

      await runCommand(command);

      await expectSameSyncContentEnvironments(environmentId, SYNC_SOURCE_TEST_ENVIRONMENT_ID, [
        "sync_item_1",
        "sync_draft_linked_item_1",
        "sync_item_2",
        "sync_linked_item_2",
        "sync_draft_linked_item_2",
        "sync_draft_item_1",
        "sync_linked_item_1",
      ]);
    }),
  );
});

describe.concurrent("Migrate content from zip", () => {
  const relativeFolderPath = "./tests/integration/migrateContent/data";
  const relativeContentZipPath = `${relativeFolderPath}/sourceContent.zip`;

  it.sequential("export migrate content", async () => {
    await fsPromises.mkdir(relativeFolderPath, { recursive: true }); // recursive skips already created folders

    const command =
      `migrate-content export -s=${SYNC_SOURCE_TEST_ENVIRONMENT_ID} --sk=${API_KEY} -f=${relativeContentZipPath} --sd=${DELIVERY_KEY} -l=${language} --byTypesCodenames no_change_linked_type no_change_base_type --skipConfirmation`;
    await runCommand(command);

    const fileExists = await fsPromises.stat(relativeContentZipPath)
      .then(stats => stats.isFile())
      .catch(() => false);

    expect(fileExists).toEqual(true);
  });

  it.sequential(
    "Run migrate content from zip",
    withTestEnvironment(SYNC_TARGET_TEST_ENVIRONMENT_ID, async (environmentId) => {
      const command =
        `migrate-content run -t=${environmentId} --tk=${API_KEY} -f=${relativeContentZipPath} -l=${language} --verbose --skipConfirmation`;

      await runCommand(command);

      await expectSameSyncContentEnvironments(environmentId, SYNC_SOURCE_TEST_ENVIRONMENT_ID, [
        "sync_item_1",
        "sync_draft_linked_item_1",
        "sync_item_2",
        "sync_linked_item_2",
        "sync_draft_linked_item_2",
        "sync_draft_item_1",
        "sync_linked_item_1",
      ]);
    }),
  );
});
