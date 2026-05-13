import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";

import type { LogOptions } from "../../../src/log.js";
import {
  normalizeEntityArrayAlias,
  normalizeSyncEntitiesAlias,
} from "../../../src/modules/sync/utils/entityAlias.js";

const logOptions: LogOptions = { logLevel: "standard" };

describe("normalizeEntityArrayAlias", () => {
  let warn: MockInstance;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
  });

  it("passes through when no alias is present", () => {
    const result = normalizeEntityArrayAlias(["livePreview", "contentTypes"], logOptions);
    expect(result).toStrictEqual(["livePreview", "contentTypes"]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("rewrites the alias to livePreview and warns once", () => {
    const result = normalizeEntityArrayAlias(["webSpotlight"], logOptions);
    expect(result).toStrictEqual(["livePreview"]);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("dedupes when both the alias and canonical name are supplied", () => {
    const result = normalizeEntityArrayAlias(["webSpotlight", "livePreview"], logOptions);
    expect(result).toStrictEqual(["livePreview"]);
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe("normalizeSyncEntitiesAlias", () => {
  let warn: MockInstance;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
  });

  it("passes through when the webSpotlight key is absent", () => {
    const result = normalizeSyncEntitiesAlias({ livePreview: true }, logOptions);
    expect(result).toStrictEqual({ livePreview: true });
    expect(warn).not.toHaveBeenCalled();
  });

  it("rewrites webSpotlight: true to livePreview: true and warns once", () => {
    const result = normalizeSyncEntitiesAlias({ webSpotlight: true }, logOptions);
    expect(result).toStrictEqual({ livePreview: true });
    expect(warn).toHaveBeenCalledOnce();
  });

  it("warns even when webSpotlight is false (deprecated key, regardless of value)", () => {
    const result = normalizeSyncEntitiesAlias({ webSpotlight: false }, logOptions);
    expect(result).toStrictEqual({ livePreview: false });
    expect(warn).toHaveBeenCalledOnce();
  });

  it("keeps an explicit livePreview value when both keys are supplied", () => {
    const result = normalizeSyncEntitiesAlias(
      { livePreview: true, webSpotlight: false },
      logOptions,
    );
    expect(result).toStrictEqual({ livePreview: true });
    expect(warn).toHaveBeenCalledOnce();
  });
});
