import { describe, it } from "@jest/globals";

import { runCommand } from "../utils/runCommand";
import { withTestEnvironment } from "../utils/setup";
import { expectSameEnvironments } from "./utils/compare";

const { EXPORT_TEST_DATA_ENVIRONMENT_ID, PRODUCTION_ENVIRONMENT_ID, API_KEY } = process.env;

if (!EXPORT_TEST_DATA_ENVIRONMENT_ID) {
  throw new Error("EXPORT_TEST_DATA_ENVIRONMENT_ID environment variable is not defined.");
}
if (!PRODUCTION_ENVIRONMENT_ID) {
  throw new Error("PRODUCTION_ENVIRONMENT_ID environment variable is not defined.");
}
if (!API_KEY) {
  throw new Error("API_KEY environment variable is not defined.");
}

describe("import", () => {
  it(
    "Importing a project imports all the entities properly into the target project",
    withTestEnvironment(async environmentId => {
      const command =
        `import -e=${environmentId} -f=tests/integration/importExport/data/exportSnapshot.zip -k=${API_KEY}`;

      await runCommand(command);

      await expectSameEnvironments(environmentId, EXPORT_TEST_DATA_ENVIRONMENT_ID, ["roles"]);
    }),
  );
});
