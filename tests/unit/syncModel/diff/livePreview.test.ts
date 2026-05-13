import { describe, expect, it } from "vitest";

import { livePreviewHandler } from "../../../../src/modules/sync/diff/livePreview.ts";
import type { LivePreviewSyncModel } from "../../../../src/modules/sync/types/syncModel.ts";

describe("livePreviewHandler", () => {
  it("returns no change when source and target statuses match", () => {
    const source: LivePreviewSyncModel = { status: "enabled" };
    const target: LivePreviewSyncModel = { status: "enabled" };

    expect(livePreviewHandler(source, target)).toStrictEqual({ change: "none" });
  });

  it("returns update when source and target statuses differ", () => {
    const source: LivePreviewSyncModel = { status: "enabled" };
    const target: LivePreviewSyncModel = { status: "disabled" };

    expect(livePreviewHandler(source, target)).toStrictEqual({
      change: "update",
      status: "enabled",
    });
  });

  it("returns update going from enabled to disabled", () => {
    const source: LivePreviewSyncModel = { status: "disabled" };
    const target: LivePreviewSyncModel = { status: "enabled" };

    expect(livePreviewHandler(source, target)).toStrictEqual({
      change: "update",
      status: "disabled",
    });
  });
});
