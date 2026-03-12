import * as fs from "node:fs";
import * as path from "node:path";
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

describe("Advanced diff GIF", () => {
  const outputFilePath = path.join(import.meta.dirname, "diffTestGif.html");
  const dateGeneratedRegex = /<span class="timestamp-pill">[^<]*<\/span>/;

  it("matches the generated file with the baseline", async () => {
    const command = `sync diff -s=${SYNC_SOURCE_TEST_ENVIRONMENT_ID} -t=${SYNC_TARGET_TEST_ENVIRONMENT_ID} --sk=${API_KEY} --tk=${API_KEY} -o="${outputFilePath}" --entities contentTypes contentTypeSnippets taxonomies -a -n`;
    await runCommand(command);

    const generatedFileContent = fs
      .readFileSync(outputFilePath, "utf-8")
      .replace(dateGeneratedRegex, `<span class="timestamp-pill">test-date</span>`);

    expect(generatedFileContent).toMatchFileSnapshot("advancedDiffGif.test.ts.snap.html");
  });

  afterAll(() => {
    if (fs.existsSync(outputFilePath)) {
      fs.unlinkSync(outputFilePath);
    }
  });
});
