import { describe, expect, it } from "@jest/globals";
import { config as dotenvConfig } from "dotenv";
import * as fsPromises from "fs/promises";
import * as path from "path";

import {
  contentTypesFileName,
  contentTypeSnippetsFileName,
  taxonomiesFileName,
} from "../../../src/modules/sync/constants/filename";
import { expectSameSyncEnvironments } from "../importExport/utils/compare";
import { runCommand } from "../utils/runCommand";
import { withTestEnvironment } from "../utils/setup";

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

describe("Sync two environments with credentials", () => {
  it.concurrent(
    "Sync source environment to target environment with providing credentials for both",
    withTestEnvironment(SYNC_TARGET_TEST_ENVIRONMENT_ID, async (environmentId) => {
      const command =
        `sync -s=${SYNC_SOURCE_TEST_ENVIRONMENT_ID} --sk=${API_KEY} -t=${environmentId} --tk=${API_KEY} --verbose --skipConfirmation`;

      await runCommand(command);

      await expectSameSyncEnvironments(environmentId, SYNC_SOURCE_TEST_ENVIRONMENT_ID, {
        include: ["types", "taxonomies", "snippets"],
      });
    }),
  );

  it.concurrent(
    "Sync target environment to source environment with providing credentials for both",
    withTestEnvironment(SYNC_SOURCE_TEST_ENVIRONMENT_ID, async (environmentId) => {
      const command =
        `sync -s=${SYNC_TARGET_TEST_ENVIRONMENT_ID} --sk=${API_KEY} -t=${environmentId} --tk=${API_KEY} --verbose --skipConfirmation`;

      await runCommand(command);

      await expectSameSyncEnvironments(environmentId, SYNC_TARGET_TEST_ENVIRONMENT_ID, {
        include: ["types", "taxonomies", "snippets"],
      });
    }),
  );
});

describe("Sync environment from folder", () => {
  const folderPath = path.join(__dirname, "data/sourceContentModel");

  it("generate sync model test", async () => {
    const command = `generate-sync-model -e ${SYNC_SOURCE_TEST_ENVIRONMENT_ID} -k ${API_KEY} -f ${folderPath}`;
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
      const command = `sync -t=${environmentId} --tk=${API_KEY} -f=${folderPath} --verbose --skipConfirmation`;

      await runCommand(command);

      await expectSameSyncEnvironments(environmentId, SYNC_SOURCE_TEST_ENVIRONMENT_ID, {
        include: ["types", "taxonomies", "snippets"],
      });
    }),
  );
});
