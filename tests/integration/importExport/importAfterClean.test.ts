import { describe, it } from "vitest";

import { runCommand } from "../utils/runCommand.ts";
import { withTestEnvironment } from "../utils/setup.ts";
import { expectSameEnvironments } from "./utils/compare.ts";

const { API_KEY, EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID, EMPTY_TEST_ENVIRONMENT_ID } = process.env;

if (!EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID) {
  throw new Error("EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID environment variable is not defined.");
}
if (!EMPTY_TEST_ENVIRONMENT_ID) {
  throw new Error("EMPTY_TEST_ENVIRONMENT_ID env variable was not provided.");
}
if (!API_KEY) {
  throw new Error("API_KEY environment variable is not defined.");
}

describe("import command", () => {
  it.concurrent(
    "Import environment, clean environment, import again",
    withTestEnvironment(EMPTY_TEST_ENVIRONMENT_ID, async environmentId => {
      const importCommand =
        `import -e=${environmentId} -f=tests/integration/importExport/data/exportSnapshot.zip -k=${API_KEY} --verbose`;
      const cleanCommand = `clean -e=${environmentId} -k=${API_KEY} -s`;

      await runCommand(importCommand);
      await runCommand(cleanCommand);
      await runCommand(importCommand);

      await expectSameEnvironments(environmentId, EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID, { exclude: ["roles"] });
    }),
  );
});
