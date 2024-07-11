import { afterAll, describe, expect, it } from "@jest/globals";
import { config as dotenvConfig } from "dotenv";
import * as fs from "fs";
import * as path from "path";

import { runCommand } from "../utils/runCommand";

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

describe("Advanced diff", () => {
  const outputFilePath = path.join(__dirname, "diffTest.html");
  const baseFilePath = path.join(__dirname, "diffBase.html");

  it("matches the generated file with the baseline", async () => {
    const command =
      `diff -s=${SYNC_SOURCE_TEST_ENVIRONMENT_ID} -t=${SYNC_TARGET_TEST_ENVIRONMENT_ID} --sk=${API_KEY} --tk=${API_KEY} -o="${outputFilePath}" -a -n`;
    await runCommand(command);

    const generatedFileContent = fs.readFileSync(outputFilePath, "utf-8").replace(
      /state from <strong>.*<\/strong>/,
      "state from <strong>Thu, 11 Jul 2024 10:31:06 GMT</strong>",
    );
    const baseFileContent = fs.readFileSync(baseFilePath, "utf-8");

    expect(generatedFileContent).toStrictEqual(baseFileContent);
  });

  afterAll(() => {
    if (fs.existsSync(outputFilePath)) {
      fs.unlinkSync(outputFilePath);
    }
  });
});
