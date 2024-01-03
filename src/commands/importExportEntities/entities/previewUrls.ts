import { PreviewContracts } from "@kontent-ai/management-sdk";

import { EntityDefinition } from "../entityDefinition.js";

export const previewUrlsEntity: EntityDefinition<PreviewContracts.IPreviewConfigurationContract> = {
  name: "previewUrls",
  fetchEntities: client => client.getPreviewConfiguration().toPromise().then(res => res.rawData),
  serializeEntities: collections => JSON.stringify(collections),
  deserializeEntities: JSON.parse,
  importEntities: async (client, previews, context) => {
    await client
      .modifyPreviewConfiguration()
      .withData({
        space_domains: previews.space_domains
          .map(s => {
            const newSpaceId = context.spaceIdsByOldIds.get(s.space.id);

            if (!newSpaceId) {
              throw new Error(`Could not find new space id for old space id ${s.space.id}. This should never happen`);
            }

            return { ...s, space: { id: newSpaceId } };
          }),
        preview_url_patterns: previews.preview_url_patterns.map(p => {
          const newContentTypeId = context.contentTypeContextByOldIds.get(p.content_type.id)?.selfId;

          if (!newContentTypeId) {
            throw new Error(
              `Could not find new content type id for old content type id ${p.content_type.id}. This should never happen`,
            );
          }

          const newUrlPatterns = p.url_patterns.map(u => {
            if (!u.space) {
              return u;
            }

            const newSpaceId = context.spaceIdsByOldIds.get(u.space.id);

            if (!newSpaceId) {
              throw new Error(`Could not find new space id for old space id ${u.space.id}. This should never happen`);
            }

            return { ...u, space: { id: newSpaceId } };
          });

          return { content_type: { id: newContentTypeId }, url_patterns: newUrlPatterns };
        }),
      })
      .toPromise();
  },
};
