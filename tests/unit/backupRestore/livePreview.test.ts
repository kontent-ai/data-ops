import { describe, expect, it } from "vitest";

import { livePreviewEntity } from "../../../src/modules/backupRestore/backupRestoreEntities/entities/livePreview.ts";

describe("livePreviewEntity.deserializeEntities", () => {
  it("reads the current { status } shape", () => {
    expect(livePreviewEntity.deserializeEntities('{"status":"enabled"}')).toStrictEqual({
      status: "enabled",
    });
  });

  it("normalizes the legacy { enabled, root_type } shape, dropping root_type", () => {
    const legacy = JSON.stringify({ enabled: true, root_type: { id: "abc" } });

    expect(livePreviewEntity.deserializeEntities(legacy)).toStrictEqual({ status: "enabled" });
  });

  it("normalizes legacy enabled=false to disabled", () => {
    expect(
      livePreviewEntity.deserializeEntities('{"enabled":false,"root_type":null}'),
    ).toStrictEqual({ status: "disabled" });
  });

  it("throws on an unexpected status value", () => {
    expect(() => livePreviewEntity.deserializeEntities('{"status":"on"}')).toThrow(
      /Unexpected live preview status/,
    );
  });

  it("throws on a null payload", () => {
    expect(() => livePreviewEntity.deserializeEntities("null")).toThrow(
      /Unexpected live preview backup payload/,
    );
  });
});
