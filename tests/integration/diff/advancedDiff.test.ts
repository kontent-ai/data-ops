import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import { config as dotenvConfig } from "dotenv";
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
  const outputFilePath = path.join(import.meta.dirname, "diffTest.html");
  const dateGeneratedRegex = /<div>state from <strong>.*<\/strong><\/div>/;

  it("matches the generated file with the baseline", async () => {
    const command = `sync diff -s=${SYNC_SOURCE_TEST_ENVIRONMENT_ID} -t=${SYNC_TARGET_TEST_ENVIRONMENT_ID} --sk=${API_KEY} --tk=${API_KEY} -o="${outputFilePath}" --entities contentTypes contentTypeSnippets taxonomies collections webSpotlight spaces assetFolders workflows languages -a -n`;
    await runCommand(command);

    const generatedFileContent = fs
      .readFileSync(outputFilePath, "utf-8")
      .replace(dateGeneratedRegex, "test-date");

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
