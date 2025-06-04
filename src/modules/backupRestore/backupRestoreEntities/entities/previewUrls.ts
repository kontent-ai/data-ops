import type { PreviewContracts } from "@kontent-ai/management-sdk";

import { notNull } from "../../../../utils/typeguards.js";
import type { EntityDefinition } from "../entityDefinition.js";

export const previewUrlsEntity = {
  name: "previewUrls",
  displayName: "previewUrls",
  fetchEntities: (client) =>
    client
      .getPreviewConfiguration()
      .toPromise()
      .then((res) => res.rawData),
  serializeEntities: (previewUrls) => JSON.stringify(previewUrls),
  deserializeEntities: JSON.parse,
  importEntities: async (client, { entities: previews, context }) => {
    await client
      .modifyPreviewConfiguration()
      .withData({
        space_domains: previews.space_domains
          .map((s) => {
            const newSpaceId = context.spaceIdsByOldIds.get(s.space.id);

            return newSpaceId ? ([s, newSpaceId] as const) : null;
          })
          .filter(notNull)
          .map(([s, newSpaceId]) => ({ ...s, space: { id: newSpaceId } })),

        preview_url_patterns: previews.preview_url_patterns
          .map((s) => {
            const newTypeId = context.contentTypeContextByOldIds.get(s.content_type.id)?.selfId;

            return newTypeId ? ([s, newTypeId] as const) : null;
          })
          .filter(notNull)
          .map(([p, newTypeId]) => {
            const newUrlPatterns = p.url_patterns
              .map((u) => {
                if (!u.space) {
                  return u;
                }

                const newSpaceId = context.spaceIdsByOldIds.get(u.space.id);

                return newSpaceId ? { ...u, space: { id: newSpaceId } } : null;
              })
              .filter(notNull);

            return { content_type: { id: newTypeId }, url_patterns: newUrlPatterns };
          }),
      })
      .toPromise();

    return context;
  },
  cleanEntities: async (client) => {
    await client
      .modifyPreviewConfiguration()
      .withData({
        preview_url_patterns: [],
        space_domains: [],
      })
      .toPromise();
  },
} as const satisfies EntityDefinition<PreviewContracts.IPreviewConfigurationContract>;
