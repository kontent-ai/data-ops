import { describe, expect, it } from "@jest/globals";
import { config as dotenvConfig } from "dotenv";

import { expectHelpText } from "../utils/expectations";
import { CommandError, runCommand } from "../utils/runCommand";
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
    "Cleans all entities in the target environment, prints info on manual WSL removal.",
    withTestEnvironment(CLEAN_TEST_DATA_ENVIRONMENT_ID, async (environmentId) => {
      const command = `clean -e=${environmentId} -k=${API_KEY} -s`;

      const result = await runCommand(command);

      expect(result.stdout).toContain(
        "⚠ Some types couldn't be deleted because Web Spotlight is enabled on the environment.",
      );

      await expectNoAssetFolders(environmentId);
      await expectNoAssets(environmentId);
      await expectNoSnippets(environmentId);
      await expectNoTypes(environmentId, true);
      await expectNoItems(environmentId);
      await expectNoWorkflows(environmentId);
      await expectNoPreviewUrls(environmentId);
      await expectNoTaxonomies(environmentId);
    }),
  );

  it.concurrent(
    "Cleans only entities specified in the include parameter.",
    withTestEnvironment(CLEAN_TEST_DATA_ENVIRONMENT_ID, async (environmentId) => {
      const command =
        `clean -e=${environmentId} -k=${API_KEY} --include spaces contentItems previewUrls contentTypes contentTypeSnippets -s`;

      await runCommand(command);

      await expectSameEnvironments(environmentId, CLEAN_TEST_DATA_ENVIRONMENT_ID, {
        exclude: ["spaces", "items", "types", "snippets", "previewUrls", "variants"],
      });

      await expectNoItems(environmentId);
      await expectNoPreviewUrls(environmentId);
      await expectNoSnippets(environmentId);
      await expectNoTypes(environmentId, true);
    }),
  );

  it.concurrent(
    "Cleans only entities not specified in the exclude parameter.",
    withTestEnvironment(CLEAN_TEST_DATA_ENVIRONMENT_ID, async (environmentId) => {
      const command = `clean -e=${environmentId} -k=${API_KEY} --exclude languages collections -s`;

      await runCommand(command);

      await expectSameEnvironments(environmentId, CLEAN_TEST_DATA_ENVIRONMENT_ID, {
        include: ["languages", "collections"],
      });

      await expectNoPreviewUrls(environmentId);
      await expectNoItems(environmentId);
      await expectNoTaxonomies(environmentId);
      await expectNoAssets(environmentId);
      await expectNoAssetFolders(environmentId);
      await expectNoSnippets(environmentId);
      await expectNoTypes(environmentId, true);
    }),
  );

  it.concurrent("Errors when removing types with existing items, prints message.", async () => {
    withTestEnvironment(CLEAN_TEST_DATA_ENVIRONMENT_ID, async (environmentId) => {
      const command = `clean -e=${environmentId} -k=${API_KEY} --include contentTypes -s`;

      const result = await runCommand(command).catch(err => err as CommandError);

      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("is still used and cannot be deleted.");
    });
  });

  it.concurrent("Errors with help when both include and exclude are provided", async () => {
    const command = "clean --include collections contentTypes --exclude contentTypes -e test -k test -s";

    const result = await runCommand(command).catch(err => err as CommandError);

    expect(result.stdout).toBe("");
    await expectHelpText(result.stderr, "clean");
    expect(result.stderr).toContain("Arguments include and exclude are mutually exclusive");
  });

  it.concurrent("Errors with help when include contains invalid entity names", async () => {
    const command = "clean --include collections invalidEntity -k test -e test -s";

    const result = await runCommand(command).catch(err => err as CommandError);

    expect(result.stdout).toBe("");
    await expectHelpText(result.stderr, "clean");
    expect(result.stderr).toContain("Invalid values");
    expect(result.stderr).toContain("include, Given: \"invalidEntity\", Choices: ");
  });

  it.concurrent("Errors with help when exclude contains invalid entity names", async () => {
    const command = "clean --exclude collections invalidEntity -k test -e test -s";

    const result = await runCommand(command).catch(err => err as CommandError);

    expect(result.stdout).toBe("");
    await expectHelpText(result.stderr, "clean");
    expect(result.stderr).toContain("Invalid values");
    expect(result.stderr).toContain("exclude, Given: \"invalidEntity\", Choices: ");
  });
});
