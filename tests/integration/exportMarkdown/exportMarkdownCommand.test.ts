import * as fsPromises from "node:fs/promises";
import * as path from "node:path";
import { config as dotenvConfig } from "dotenv";
import { beforeEach, describe, expect, it } from "vitest";

import { runCommand } from "../utils/runCommand.ts";

dotenvConfig();

const { SYNC_SOURCE_TEST_ENVIRONMENT_ID } = process.env;

if (!SYNC_SOURCE_TEST_ENVIRONMENT_ID) {
  throw new Error("SYNC_SOURCE_TEST_ENVIRONMENT_ID environment variable is not defined.");
}

const testOutputDir = path.join(process.cwd(), "tests/integration/exportMarkdown/test-output");

describe("export-markdown CLI command", () => {
  beforeEach(async () => {
    await fsPromises.rm(testOutputDir, { force: true, recursive: true });
  });

  it("exports sync_item_1 to markdown via CLI", async () => {
    const command = `export markdown -e ${SYNC_SOURCE_TEST_ENVIRONMENT_ID} -l default -o ${testOutputDir} --items sync_item_1`;

    await runCommand(command);

    const stats = await fsPromises.stat(testOutputDir);
    expect(stats.isDirectory()).toBe(true);

    const files = await fsPromises.readdir(testOutputDir);
    expect(files).toContain("sync_item_1.md");

    const content = await fsPromises.readFile(path.join(testOutputDir, "sync_item_1.md"), "utf-8");
    expect(content).toContain("codename: sync_item_1");
  }, 30000);
});
