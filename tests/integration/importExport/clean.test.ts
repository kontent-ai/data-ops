import { describe, it } from "@jest/globals";
import { config as dotenvConfig } from "dotenv";

import { runCommand } from "../utils/runCommand";
import { withTestEnvironment } from "../utils/setup";
import { expectSameEnvironments } from "./utils/compare";
import {
  expectNoAssetFolders,
  expectNoAssets,
  expectNoItems,
  expectNoPreviewUrls,
  expectNoSnippets,
  expectNoTaxonomies,
  expectNoTypes,
  expectNoWorkflows,
} from "./utils/isEmpty";

dotenvConfig();

const { API_KEY, CLEAN_TEST_DATA_ENVIRONMENT_ID } = process.env;

if (!CLEAN_TEST_DATA_ENVIRONMENT_ID) {
  throw new Error("CLEAN_TEST_DATA_ENVIRONMENT_ID environment variable is not defined.");
}

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not defined.");
}

describe("clean command", () => {
  it.concurrent(
    "Cleans all entities in the target environment.",
    withTestEnvironment(async (environmentId) => {
      const command = `clean -e=${environmentId} -k=${API_KEY}`;

      await runCommand(command);

      await expectNoAssetFolders(environmentId);
      await expectNoAssets(environmentId);
      await expectNoSnippets(environmentId);
      await expectNoTypes(environmentId, true);
      await expectNoItems(environmentId);
      await expectNoWorkflows(environmentId);
      await expectNoPreviewUrls(environmentId);
      await expectNoTaxonomies(environmentId);
    }, false),
  );

  it.concurrent(
    "Cleans only entities specified in the include parameter.",
    withTestEnvironment(async (environmentId) => {
      const command = `clean -e=${environmentId} -k=${API_KEY} --include spaces contentItems taxonomies`;

      await runCommand(command);

      await expectSameEnvironments(environmentId, CLEAN_TEST_DATA_ENVIRONMENT_ID, {
        exclude: ["spaces", "items", "taxonomies", "previewUrls"],
      });

      await expectNoTaxonomies(environmentId);
      await expectNoItems(environmentId);
      await expectNoPreviewUrls(environmentId);
    }, false),
  );

  it.concurrent(
    "Cleans only entities not specified in the exclude parameter.",
    withTestEnvironment(async (environmentId) => {
      const command =
        `clean -e=${environmentId} -k=${API_KEY} --exclude languages collections`;

      await runCommand(command);

      await expectSameEnvironments(environmentId, CLEAN_TEST_DATA_ENVIRONMENT_ID, {
        include: ["languages", "collections"],
      });

      await expectNoPreviewUrls(environmentId);
      await expectNoItems(environmentId);
      await expectNoTaxonomies(environmentId);
      await expectNoAssets(environmentId);
      await expectNoAssetFolders(environmentId);
    }, false),
  );
});
