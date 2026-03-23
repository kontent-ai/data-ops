import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

import { type CommandError, runCommand } from "../utils/runCommand.ts";

const sourceContentModelFolder = "tests/integration/sync/data/sourceContentModel";
const partialSourceContentModelFolder = "tests/integration/sync/data/partialSourceContentModel";

describe("sync validate", () => {
  it("succeeds for a valid folder with all entities", async () => {
    const command = `sync validate -f ${sourceContentModelFolder} --entities contentTypes contentTypeSnippets taxonomies collections assetFolders spaces languages webSpotlight workflows`;

    const result = await runCommand(command);

    expect(result.stderr).toBe("");
  });

  it("succeeds for a valid folder with filtered entities", async () => {
    const command = `sync validate -f ${sourceContentModelFolder} --entities contentTypes taxonomies`;

    const result = await runCommand(command);

    expect(result.stderr).toBe("");
  });

  it("fails for a non-existent folder path", async () => {
    const command = `sync validate -f non/existent/folder --entities contentTypes`;

    const result = await runCommand(command).catch((e: CommandError) => e);

    expect(result.stderr).toContain("non/existent/folder");
  });

  it("fails when a required entity file is missing from the folder", async () => {
    const command = `sync validate -f ${partialSourceContentModelFolder} --entities contentTypes spaces`;

    const result = await runCommand(command).catch((e: CommandError) => e);

    expect(result.stderr).toContain("spaces.json");
  });

  it("fails when a file has invalid schema content", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sync-validate-test-"));

    try {
      await fs.writeFile(path.join(tmpDir, "contentTypes.json"), JSON.stringify([{ bad: "data" }]));

      const command = `sync validate -f ${tmpDir} --entities contentTypes`;

      const result = await runCommand(command).catch((e: CommandError) => e);

      expect(result.stderr).toContain("contentTypes.json");
    } finally {
      await fs.rm(tmpDir, { recursive: true });
    }
  });
});
