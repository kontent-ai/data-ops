import { describe, expect, it } from "@jest/globals";
import { config as dotenvConfig } from "dotenv";
import * as fsPromises from "fs/promises";

import { expectSameAllEnvData, prepareReferences } from "../../importExport/utils/compare.ts";
import { loadAllEnvData, loadVariantsByItemCodename } from "../../importExport/utils/envData.ts";
import { runCommand } from "../../utils/runCommand.ts";
import { withTestEnvironment } from "../../utils/setup.ts";

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

const expectSameSyncContentEnvironments = async (
  environmentId1: string,
  environmentId2: string,
  itemCodenames: ReadonlyArray<string>,
): Promise<void> => {
  const data1 = await loadAllEnvData(environmentId1, { include: ["types"] })
    .then(async res => ({ ...(await loadVariantsByItemCodename(environmentId1, itemCodenames)), types: res.types }))
    .then(prepareReferences);
  const data2 = await loadAllEnvData(environmentId2, { include: ["types"] })
    .then(async res => ({ ...(await loadVariantsByItemCodename(environmentId2, itemCodenames)), types: res.types }))
    .then(prepareReferences);

  expectSameAllEnvData(data1, data2, { include: ["variants"] });
};

describe("Sync two environments with credentials", () => {
  it.concurrent(
    "sync-content source environment to target environment without linked item",
    withTestEnvironment(SYNC_TARGET_TEST_ENVIRONMENT_ID, async (environmentId) => {
      const command =
        `sync-content run -s=${SYNC_SOURCE_TEST_ENVIRONMENT_ID} --sk=${API_KEY} -t=${environmentId} --tk=${API_KEY} -l=default --items sync_item_1 --verbose --skipConfirmation`;

      await runCommand(command);

      await expectSameSyncContentEnvironments(environmentId, SYNC_SOURCE_TEST_ENVIRONMENT_ID, ["sync_item_1"]);
    }),
  );

  it.concurrent(
    "Sync source environment to target environment directly from source environment with linked item",
    withTestEnvironment(SYNC_TARGET_TEST_ENVIRONMENT_ID, async (environmentId) => {
      const command =
        `sync-content run -s=${SYNC_SOURCE_TEST_ENVIRONMENT_ID} --sk=${API_KEY} -t=${environmentId} --tk=${API_KEY} -l=default --sd=${DELIVERY_KEY} --items sync_item_1 --depth 2 --verbose --skipConfirmation`;

      await runCommand(command);

      await expectSameSyncContentEnvironments(environmentId, SYNC_SOURCE_TEST_ENVIRONMENT_ID, [
        "sync_item_1",
        "sync_linked_item_1",
      ]);
    }),
  );

  it.concurrent(
    "Sync source environment to target environment directly from source environment get item byContentType with linked item",
    withTestEnvironment(SYNC_TARGET_TEST_ENVIRONMENT_ID, async (environmentId) => {
      const command =
        `sync-content run -s=${SYNC_SOURCE_TEST_ENVIRONMENT_ID} --sk=${API_KEY} -t=${environmentId} --tk=${API_KEY} --sd=${DELIVERY_KEY} -l=default --byTypesCodenames no_change_linked_type no_change_base_type --verbose --skipConfirmation`;

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

describe("Sync environment from folder", () => {
  const relativeFolderPath = "./tests/integration/sync/content/data";
  const relativeContentZipPath = `${relativeFolderPath}/sourceContent.zip`;

  it("export sync content", async () => {
    await fsPromises.mkdir(relativeFolderPath, { recursive: true }); // recursive skips already created folders

    const command =
      `sync-content export -s ${SYNC_SOURCE_TEST_ENVIRONMENT_ID} --sk ${API_KEY} -f ${relativeContentZipPath} --sd=${DELIVERY_KEY} -l default --byTypesCodenames no_change_linked_type no_change_base_type --skipConfirmation`;
    await runCommand(command);

    const fileExists = await fsPromises.stat(relativeContentZipPath)
      .then(stats => stats.isFile())
      .catch(() => false);

    expect(fileExists).toEqual(true);
  });

  it(
    "Sync content from folder",
    withTestEnvironment(SYNC_TARGET_TEST_ENVIRONMENT_ID, async (environmentId) => {
      const command =
        `sync-content run -t=${environmentId} --tk=${API_KEY} -f=${relativeContentZipPath} -l default --verbose --skipConfirmation`;

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
