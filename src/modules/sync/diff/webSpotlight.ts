import { match } from "ts-pattern";

import type { WebSpotlightDiffModel } from "../types/diffModel.js";
import type { WebSpotlightSyncModel } from "../types/syncModel.js";

export const webSpotlightHandler = (
  source: WebSpotlightSyncModel,
  target: WebSpotlightSyncModel,
): WebSpotlightDiffModel =>
  match({ source: source.enabled, target: target.enabled })
    .with({ source: true, target: true }, () =>
      source.root_type?.codename === target.root_type?.codename
        ? ({ change: "none" } as const)
        : ({
            change: "changeRootType",
            rootTypeCodename: source.root_type?.codename ?? "",
          } as const),
    )
    .with({ source: false, target: false }, () => ({ change: "none" }) as const)
    .with({ source: false, target: true }, () => ({ change: "deactivate" }) as const)
    .with(
      { source: true, target: false },
      () => ({ change: "activate", rootTypeCodename: source.root_type?.codename ?? "" }) as const,
    )
    .exhaustive();
