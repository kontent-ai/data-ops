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

const { EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID, API_KEY } = process.env;

if (!EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID) {
  throw new Error("EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID environment variable is not defined.");
}
if (!API_KEY) {
  throw new Error("API_KEY environment variable is not defined.");
}

describe("import command", () => {
  it.concurrent(
    "Imports all entities properly into the target project",
    withTestEnvironment(async environmentId => {
      const command =
        `import -e=${environmentId} -f=tests/integration/importExport/data/exportSnapshot.zip -k=${API_KEY} --verbose`;

      await runCommand(command);

      await expectSameEnvironments(environmentId, EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID, { exclude: ["roles"] });
    }),
  );

  it.concurrent(
    "Imports only entities specified in the include parameter",
    withTestEnvironment(async environmentId => {
      const command =
        `import -e=${environmentId} -f=tests/integration/importExport/data/exportSnapshot.zip -k=${API_KEY} --include collections languages spaces taxonomies`;

      await runCommand(command);

      await expectSameEnvironments(environmentId, EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID, {
        include: ["collections", "languages", "spaces", "taxonomies"],
      });

      await expectNoAssetFolders(environmentId);
      await expectNoAssets(environmentId);
      await expectNoSnippets(environmentId);
      await expectNoTypes(environmentId);
      await expectNoItems(environmentId);
      await expectNoWorkflows(environmentId);
      await expectNoPreviewUrls(environmentId);
    }),
  );

  it.concurrent(
    "Imports all entities except those specified in the exclude parameter",
    withTestEnvironment(async environmentId => {
      const command =
        `import -e=${environmentId} -f=tests/integration/importExport/data/exportSnapshot.zip -k=${API_KEY} --exclude assets contentTypes contentTypeSnippets taxonomies contentItems languageVariants workflows previewUrls webhooks`;

      await runCommand(command);

      await expectSameEnvironments(environmentId, EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID, {
        exclude: [
          "assets",
          "roles",
          "types",
          "snippets",
          "taxonomies",
          "items",
          "variants",
          "workflows",
          "previewUrls",
          "webhooks",
        ],
      });

      await expectNoAssets(environmentId);
      await expectNoTypes(environmentId);
      await expectNoSnippets(environmentId);
      await expectNoTaxonomies(environmentId);
      await expectNoItems(environmentId);
      await expectNoWorkflows(environmentId);
      await expectNoPreviewUrls(environmentId);
    }),
  );

  it.concurrent("Errors with help when both include and exclude are provided", async () => {
    const command = "import --include collections contentTypes --exclude contentTypes -f test -k test -e test";

    const result = await runCommand(command).catch(err => err as CommandError);

    expect(result.stdout).toBe("");
    await expectHelpText(result.stderr, "import");
    expect(result.stderr).toContain("Arguments include and exclude are mutually exclusive");
  });

  it.concurrent("Errors with help when include contains invalid entity names", async () => {
    const command = "import --include collections invalidEntity -f test -k test -e test";

    const result = await runCommand(command).catch(err => err as CommandError);

    expect(result.stdout).toBe("");
    await expectHelpText(result.stderr, "import");
    expect(result.stderr).toContain("Invalid values");
    expect(result.stderr).toContain("include, Given: \"invalidEntity\", Choices: ");
  });

  it.concurrent("Errors with help when exclude contains invalid entity names", async () => {
    const command = "import --exclude collections invalidEntity -f test -k test -e test";

    const result = await runCommand(command).catch(err => err as CommandError);

    expect(result.stdout).toBe("");
    await expectHelpText(result.stderr, "import");
    expect(result.stderr).toContain("Invalid values");
    expect(result.stderr).toContain("exclude, Given: \"invalidEntity\", Choices: ");
  });
});
