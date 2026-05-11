import { describe, expect, it, vi } from "vitest";
import { migrateContentRun } from "../../../src/modules/migrateContent/migrateContentRun.ts";

// Mock the migration-toolkit
vi.mock("@kontent-ai/migration-toolkit", () => ({
  migrateAsync: vi.fn().mockResolvedValue(undefined),
  extractAsync: vi.fn(),
  importAsync: vi.fn(),
}));

describe("migrateContentRun", () => {
  it("should pass tolerateMissingReferences parameter to migrateAsync", async () => {
    const { migrateAsync } = await import("@kontent-ai/migration-toolkit");
    
    await migrateContentRun({
      sourceEnvironmentId: "source-env",
      sourceApiKey: "source-key",
      targetEnvironmentId: "target-env",
      targetApiKey: "target-key",
      language: "default",
      items: ["item1"],
      tolerateMissingReferences: true,
    });

    expect(migrateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceEnvironment: expect.objectContaining({
          tolerateMissingReferences: true,
        }),
      }),
    );
  });

  it("should default tolerateMissingReferences to false when not provided", async () => {
    const { migrateAsync } = await import("@kontent-ai/migration-toolkit");
    
    await migrateContentRun({
      sourceEnvironmentId: "source-env",
      sourceApiKey: "source-key",
      targetEnvironmentId: "target-env",
      targetApiKey: "target-key",
      language: "default",
      items: ["item1"],
    });

    expect(migrateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceEnvironment: expect.objectContaining({
          tolerateMissingReferences: false,
        }),
      }),
    );
  });
});
