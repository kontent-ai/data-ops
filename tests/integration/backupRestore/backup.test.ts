import * as fsPromises from "node:fs/promises";
import { config as dotenvConfig } from "dotenv";
import { describe, expect, it } from "vitest";

import { backupEnvironment } from "../../../src/public.ts";
import { expectHelpText } from "../utils/expectations.ts";
import { type CommandError, runCommand } from "../utils/runCommand.ts";
import { expectSameAllEnvData } from "./utils/compare.ts";
import { loadAllEnvData, loadAllEnvDataFromZip } from "./utils/envData.ts";

dotenvConfig();

const { EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID, API_KEY } = process.env;

if (!EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID) {
  throw new Error("EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID environment variable is not defined.");
}
if (!API_KEY) {
  throw new Error("API_KEY environment variable is not defined.");
}

describe("backup command", () => {
  it("Backup all entities properly into the specified file", async () => {
    const filePath = "./tests/integration/backupRestore/data/exportedData.zip";
    await fsPromises.rm(filePath, { force: true });
    const command = `environment backup -e ${EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID} -k ${API_KEY} -f ${filePath}`;

    await runCommand(command);

    const sourceEnvData = await loadAllEnvData(EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID);
    const exportedData = await loadAllEnvDataFromZip(filePath);

    expectSameAllEnvData(exportedData, sourceEnvData);
  });

  it("Backup only entities specified in the include parameter", async () => {
    const filePath = "./tests/integration/backupRestore/data/exportedData.zip";
    await fsPromises.rm(filePath, { force: true });
    const command = `environment backup -e ${EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID} -k ${API_KEY} -f ${filePath} --include collections spaces taxonomies contentTypes`;

    await runCommand(command);

    const sourceEnvData = await loadAllEnvData(EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID);
    const exportedData = await loadAllEnvDataFromZip(filePath);

    expectSameAllEnvData(exportedData, sourceEnvData, {
      include: ["collections", "spaces", "taxonomies", "types"],
    });
    expect(exportedData.assets).toBeUndefined();
    expect(exportedData.assetFolders).toBeUndefined();
    expect(exportedData.items).toBeUndefined();
    expect(exportedData.variants).toBeUndefined();
    expect(exportedData.snippets).toBeUndefined();
    expect(exportedData.workflows).toBeUndefined();
    expect(exportedData.previewUrls).toBeUndefined();
    expect(exportedData.roles).toBeUndefined();
    expect(exportedData.languages).toBeUndefined();
  });

  it("Backup all entities except those specified in the exclude parameter", async () => {
    const filePath = "./tests/integration/backupRestore/data/exportedData.zip";
    await fsPromises.rm(filePath, { force: true });
    const command = `environment backup -e ${EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID} -k ${API_KEY} -f ${filePath} --exclude collections spaces taxonomies contentTypes`;

    await runCommand(command);

    const sourceEnvData = await loadAllEnvData(EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID);
    const exportedData = await loadAllEnvDataFromZip(filePath);

    expectSameAllEnvData(exportedData, sourceEnvData, {
      exclude: ["collections", "spaces", "taxonomies", "types"],
    });
    expect(exportedData.collections).toBeUndefined();
    expect(exportedData.spaces).toBeUndefined();
    expect(exportedData.taxonomies).toBeUndefined();
    expect(exportedData.types).toBeUndefined();
  });

  it("Backup all entities except those specified in the exclude parameter using API", async () => {
    const filePath = "./tests/integration/backupRestore/data/exportedData.zip";
    await fsPromises.rm(filePath, { force: true });

    await backupEnvironment({
      environmentId: EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID,
      apiKey: API_KEY,
      fileName: filePath,
      exclude: ["collections", "spaces", "taxonomies", "contentTypes"],
    });

    const sourceEnvData = await loadAllEnvData(EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID);
    const exportedData = await loadAllEnvDataFromZip(filePath);

    expectSameAllEnvData(exportedData, sourceEnvData, {
      exclude: ["collections", "spaces", "taxonomies", "types"],
    });
    expect(exportedData.collections).toBeUndefined();
    expect(exportedData.spaces).toBeUndefined();
    expect(exportedData.taxonomies).toBeUndefined();
    expect(exportedData.types).toBeUndefined();
  });

  it.concurrent("Errors with help when both include and exclude are provided", async () => {
    const command =
      "environment backup --include collections contentTypes --exclude contentTypes -f test -k test -e test";

    const result = await runCommand(command).catch((err) => err as CommandError);

    expect(result.stdout).toBe("");
    await expectHelpText(result.stderr, "environment backup");
    expect(result.stderr).toContain("Arguments include and exclude are mutually exclusive");
  });

  it.concurrent("Errors with help when include contains invalid entity names", async () => {
    const command =
      "environment backup --include collections invalidEntity -f test -k test -e test";

    const result = await runCommand(command).catch((err) => err as CommandError);

    expect(result.stdout).toBe("");
    await expectHelpText(result.stderr, "environment backup");
    expect(result.stderr).toContain("Invalid values");
    expect(result.stderr).toContain('include, Given: "invalidEntity", Choices: ');
  });

  it.concurrent("Errors with help when exclude contains invalid entity names", async () => {
    const command =
      "environment backup --exclude collections invalidEntity -f test -k test -e test";

    const result = await runCommand(command).catch((err) => err as CommandError);

    expect(result.stdout).toBe("");
    await expectHelpText(result.stderr, "environment backup");
    expect(result.stderr).toContain("Invalid values");
    expect(result.stderr).toContain('exclude, Given: "invalidEntity", Choices: ');
  });
});
