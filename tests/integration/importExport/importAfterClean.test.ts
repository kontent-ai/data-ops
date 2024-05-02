import { describe, it } from "@jest/globals";

import { runCommand } from "../utils/runCommand";
import { withTestEnvironment } from "../utils/setup";
import { expectSameEnvironments } from "./utils/compare";

const { API_KEY, EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID } = process.env;

if (!EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID) {
  throw new Error("EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID environment variable is not defined.");
}

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not defined.");
}

describe("import command", () => {
  it.concurrent(
    "Import environment, clean environment, import again",
    withTestEnvironment(async environmentId => {
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
