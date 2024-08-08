import { describe, expect, it } from "@jest/globals";

import { webSpotlightHandler } from "../../../../src/modules/sync/diff/webSpotlight.ts";
import { WebSpotlightSyncModel } from "../../../../src/modules/sync/types/syncModel.ts";

describe("webSpotlightHandler", () => {
  it("returns no change when both disabled", () => {
    const source: WebSpotlightSyncModel = {
      enabled: false,
      root_type: null,
    };
    const target: WebSpotlightSyncModel = {
      enabled: false,
      root_type: null,
    };

    const result = webSpotlightHandler(source, target);

    expect(result).toStrictEqual({ change: "none" });
  });

  it("returns no change when both disabled and different root types", () => {
    const source: WebSpotlightSyncModel = {
      enabled: false,
      root_type: { codename: "some_codename" },
    };
    const target: WebSpotlightSyncModel = {
      enabled: false,
      root_type: null,
    };

    const result = webSpotlightHandler(source, target);

    expect(result).toStrictEqual({ change: "none" });
  });

  it("returns no change when both enabled and the same root type", () => {
    const source: WebSpotlightSyncModel = {
      enabled: true,
      root_type: { codename: "some_codename" },
    };
    const target: WebSpotlightSyncModel = {
      enabled: true,
      root_type: { codename: "some_codename" },
    };

    const result = webSpotlightHandler(source, target);

    expect(result).toStrictEqual({ change: "none" });
  });

  it("returns deactivate when source is disabled and target is enabled", () => {
    const source: WebSpotlightSyncModel = {
      enabled: false,
      root_type: null,
    };
    const target: WebSpotlightSyncModel = {
      enabled: true,
      root_type: { codename: "some_codename" },
    };

    const result = webSpotlightHandler(source, target);

    expect(result).toStrictEqual({ change: "deactivate" });
  });

  it("returns activate with a root type when source is enabled and target is disabled", () => {
    const source: WebSpotlightSyncModel = {
      enabled: true,
      root_type: { codename: "some_codename" },
    };
    const target: WebSpotlightSyncModel = {
      enabled: false,
      root_type: null,
    };

    const result = webSpotlightHandler(source, target);

    expect(result).toStrictEqual({ change: "activate", rootTypeCodename: "some_codename" });
  });

  it("returns changeRootType when both enabled and different root types", () => {
    const source: WebSpotlightSyncModel = {
      enabled: true,
      root_type: { codename: "some_codename" },
    };
    const target: WebSpotlightSyncModel = {
      enabled: true,
      root_type: { codename: "some_other_codename" },
    };

    const result = webSpotlightHandler(source, target);

    expect(result).toStrictEqual({ change: "changeRootType", rootTypeCodename: "some_codename" });
  });
});
