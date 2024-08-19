import * as childProcess from "child_process";
import { config as dotenvConfig } from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { afterAll, describe, expect, it } from "vitest";

import { runCommand } from "../utils/runCommand.ts";

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
  const dateGeneratedRegex = /<div>state from <strong>.*<\/strong><\/div>/;

  it("matches the generated file with the baseline", async () => {
    const command =
      `sync-model diff -s=${SYNC_SOURCE_TEST_ENVIRONMENT_ID} -t=${SYNC_TARGET_TEST_ENVIRONMENT_ID} --sk=${API_KEY} --tk=${API_KEY} -o="${outputFilePath}" -a -n`;
    await runCommand(command);

    const generatedFileContent = fs.readFileSync(outputFilePath, "utf-8")
      .replace(
        dateGeneratedRegex,
        "test-date",
      );

    const fmtPromise = promisify(childProcess.exec)(`dprint fmt --stdin ${outputFilePath}`);
    fmtPromise.child.stdin?.write(generatedFileContent);
    fmtPromise.child.stdin?.end();

    const result = await fmtPromise;

    expect(result.stdout).toMatchFileSnapshot("advancedDiff.test.ts.snap.html");
  });

  afterAll(() => {
    if (fs.existsSync(outputFilePath)) {
      fs.unlinkSync(outputFilePath);
    }
  });
});
