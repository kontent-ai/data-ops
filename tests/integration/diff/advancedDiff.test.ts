import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { config as dotenvConfig } from "dotenv";
import { existsSync, readFileSync, unlinkSync } from "fs";
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

  beforeAll(() => {
    process.env.MOCKED_DATE = new Date(Date.UTC(2024, 1, 1)).toISOString();
  });

  it("should match the generated file with the baseline", async () => {
    const command =
      `diff -s=${SYNC_SOURCE_TEST_ENVIRONMENT_ID} -t=${SYNC_TARGET_TEST_ENVIRONMENT_ID} --sk=${API_KEY} --tk=${API_KEY} -o="${outputFilePath}" -a -n`;
    await runCommand(command);

    const generatedFileContent = readFileSync(outputFilePath, "utf-8");
    const baseFileContent = readFileSync(baseFilePath, "utf-8");

    expect(generatedFileContent).toStrictEqual(baseFileContent);
  });

  afterAll(() => {
    delete process.env.MOCKED_DATE;

    if (existsSync(outputFilePath)) {
      unlinkSync(outputFilePath);
    }
  });
});
