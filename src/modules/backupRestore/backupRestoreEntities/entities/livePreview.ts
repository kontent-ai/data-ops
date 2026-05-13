import type { EntityDefinition } from "../entityDefinition.js";

type LivePreviewStatus = "enabled" | "disabled";

export type LivePreviewBackupEntity = Readonly<{ status: LivePreviewStatus }>;

type LegacyWebSpotlightEntity = Readonly<{
  enabled: boolean;
  root_type: { id: string } | null;
}>;

const isLegacyShape = (parsed: unknown): parsed is LegacyWebSpotlightEntity =>
  typeof parsed === "object" &&
  parsed !== null &&
  "enabled" in parsed &&
  typeof (parsed as { enabled: unknown }).enabled === "boolean";

const parseStatus = (value: unknown): LivePreviewStatus => {
  if (value !== "enabled" && value !== "disabled") {
    throw new Error(`Unexpected live preview status: ${JSON.stringify(value)}`);
  }
  return value;
};

// Older backups carry the legacy {enabled, root_type} shape — root_type is dropped
// because the new live_preview endpoint has no global root concept.
const normalizeFromLegacy = (parsed: unknown): LivePreviewBackupEntity => {
  if (isLegacyShape(parsed)) {
    return { status: parsed.enabled ? "enabled" : "disabled" };
  }
  if (typeof parsed === "object" && parsed !== null && "status" in parsed) {
    return { status: parseStatus(parsed.status) };
  }
  throw new Error(`Unexpected live preview backup payload: ${JSON.stringify(parsed)}`);
};

export const livePreviewEntity = {
  name: "livePreview",
  legacyNames: ["webSpotlight"],
  displayName: "live preview",
  fetchEntities: (client) =>
    client
      .getLivePreviewConfiguration()
      .toPromise()
      .then(
        (res): LivePreviewBackupEntity => ({
          status: parseStatus(res.rawData.status),
        }),
      ),
  serializeEntities: JSON.stringify,
  importEntities: async (client, { entities: livePreview, context }) => {
    await client
      .changeLivePreviewConfiguration()
      .withData({ status: livePreview.status })
      .toPromise();
    return context;
  },
  deserializeEntities: (serialized) => normalizeFromLegacy(JSON.parse(serialized)),
  cleanEntities: async (client) => {
    await client.changeLivePreviewConfiguration().withData({ status: "disabled" }).toPromise();
  },
} as const satisfies EntityDefinition<LivePreviewBackupEntity>;
