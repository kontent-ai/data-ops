import { config as dotenvConfig } from "dotenv";
import * as fsPromises from "fs/promises";
import * as path from "path";
import { describe, expect, it } from "vitest";

import {
  contentTypesFileName,
  contentTypeSnippetsFileName,
  taxonomiesFileName,
} from "../../../src/modules/sync/constants/filename.ts";
import { syncModelRun } from "../../../src/public.ts";
import { expectSameAllEnvData, prepareReferences } from "../importExport/utils/compare.ts";
import { loadAllEnvData } from "../importExport/utils/envData.ts";
import { runCommand } from "../utils/runCommand.ts";
import { withTestEnvironment } from "../utils/setup.ts";

dotenvConfig();

const { SYNC_SOURCE_TEST_ENVIRONMENT_ID, API_KEY, SYNC_TARGET_TEST_ENVIRONMENT_ID } = process.env;

if (!API_KEY) {
  throw new Error("API_KEY env variable was not provided.");
}
if (!SYNC_SOURCE_TEST_ENVIRONMENT_ID) {
  throw new Error("SYNC_SOURCE_TEST_ENVIRONMENT_ID environment variable is not defined.");
}
if (!SYNC_TARGET_TEST_ENVIRONMENT_ID) {
  throw new Error("SYNC_TARGET_TEST_ENVIRONMENT_ID env variable was not provided.");
}

const expectSameSyncEnvironments = async (
  environmentId1: string,
  environmentId2: string,
): Promise<void> => {
  const data1 = await loadAllEnvData(environmentId1, { include: ["types", "snippets", "taxonomies", "webSpotlight"] })
    .then(prepareReferences);
  const data2 = await loadAllEnvData(environmentId2, { include: ["types", "snippets", "taxonomies", "webSpotlight"] })
    .then(prepareReferences);

  expectSameAllEnvData(data1, data2, { include: ["types", "snippets", "taxonomies"] });
};

describe("Sync model of two environments with credentials", () => {
  it.concurrent(
    "Sync source environment to target environment directly from source environment",
    withTestEnvironment(SYNC_TARGET_TEST_ENVIRONMENT_ID, async (environmentId) => {
      const command =
        `sync-model run -s=${SYNC_SOURCE_TEST_ENVIRONMENT_ID} --sk=${API_KEY} -t=${environmentId} --tk=${API_KEY} --verbose --skipConfirmation`;

      await runCommand(command);

      await expectSameSyncEnvironments(environmentId, SYNC_SOURCE_TEST_ENVIRONMENT_ID);
    }),
  );

  it.concurrent(
    "Sync target environment to source environment directly from target environment using API",
    withTestEnvironment(SYNC_SOURCE_TEST_ENVIRONMENT_ID, async (environmentId) => {
      await syncModelRun({
        sourceEnvironmentId: SYNC_TARGET_TEST_ENVIRONMENT_ID,
        sourceApiKey: API_KEY,
        targetEnvironmentId: environmentId,
        targetApiKey: API_KEY,
        verbose: true,
      });

      await expectSameSyncEnvironments(environmentId, SYNC_TARGET_TEST_ENVIRONMENT_ID);
    }),
  );
});

describe("Sync environment from folder", () => {
  const folderPath = path.join(__dirname, "data/sourceContentModel");

  it("generate sync model test", async () => {
    const command = `sync-model export -e ${SYNC_SOURCE_TEST_ENVIRONMENT_ID} -k ${API_KEY} -f ${folderPath}`;
    await runCommand(command);

    const folderExists = await fsPromises.stat(folderPath)
      .then(stats => stats.isDirectory())
      .catch(() => false);

    const typesJsonExists = await fsPromises.stat(`${folderPath}/${contentTypesFileName}`)
      .then(stats => stats.isFile())
      .catch(() => false);
    const snippetJsonExists = await fsPromises.stat(`${folderPath}/${contentTypeSnippetsFileName}`)
      .then(stats => stats.isFile())
      .catch(() => false);
    const taxonomiesJsonExists = await fsPromises.stat(`${folderPath}/${taxonomiesFileName}`)
      .then(stats => stats.isFile())
      .catch(() => false);

    expect(folderExists).toEqual(true);
    expect(typesJsonExists).toEqual(true);
    expect(snippetJsonExists).toEqual(true);
    expect(taxonomiesJsonExists).toEqual(true);
  });

  it(
    "Sync environment from folder",
    withTestEnvironment(SYNC_TARGET_TEST_ENVIRONMENT_ID, async (environmentId) => {
      const command =
        `sync-model run -t=${environmentId} --tk=${API_KEY} -f=${folderPath} --verbose --skipConfirmation`;

      await runCommand(command);

      await expectSameSyncEnvironments(environmentId, SYNC_SOURCE_TEST_ENVIRONMENT_ID);
    }),
  );
});
