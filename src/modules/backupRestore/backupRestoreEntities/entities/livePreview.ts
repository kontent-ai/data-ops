import type { EntityDefinition } from "../entityDefinition.js";

export type LivePreviewBackupEntity = Readonly<{ status: string }>;

type LegacyWebSpotlightEntity = Readonly<{
  enabled: boolean;
  root_type: { id: string } | null;
}>;

const isLegacyShape = (parsed: unknown): parsed is LegacyWebSpotlightEntity =>
  typeof parsed === "object" &&
  parsed !== null &&
  "enabled" in parsed &&
  typeof (parsed as { enabled: unknown }).enabled === "boolean";

// Older backups carry the legacy {enabled, root_type} shape — root_type is dropped
// because the new live_preview endpoint has no global root concept.
const normalizeFromLegacy = (parsed: unknown): LivePreviewBackupEntity =>
  isLegacyShape(parsed)
    ? { status: parsed.enabled ? "enabled" : "disabled" }
    : (parsed as LivePreviewBackupEntity);

export const livePreviewEntity = {
  name: "livePreview",
  legacyName: "webSpotlight",
  displayName: "live preview",
  fetchEntities: (client) =>
    client
      .getLivePreviewConfiguration()
      .toPromise()
      .then((res): LivePreviewBackupEntity => ({ status: res.rawData.status })),
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
