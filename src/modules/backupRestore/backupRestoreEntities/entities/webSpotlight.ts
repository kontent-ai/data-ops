import { WebSpotlightContracts } from "@kontent-ai/management-sdk";

import { getRequired } from "../../utils/utils.js";
import { EntityDefinition } from "../entityDefinition.js";

export const webSpotlightEntity = {
  name: "webSpotlight",
  displayName: "webSpotlight",
  fetchEntities: client => client.checkWebSpotlightStatus().toPromise().then(res => res.rawData),
  serializeEntities: JSON.stringify,
  importEntities: async (client, { entities: fileWebSpotlight, context }) => {
    if (fileWebSpotlight.enabled) {
      const rootTypeId = getRequired(
        context.contentTypeContextByOldIds,
        fileWebSpotlight.root_type?.id ?? "missing-ws-root-id",
        "content type",
      ).selfId;

      await client.activateWebSpotlight().withData({ root_type: { id: rootTypeId } }).toPromise();
    } else {
      await client.deactivateWebSpotlight().toPromise();
    }

    return context;
  },
  deserializeEntities: JSON.parse,
  cleanEntities: async client => {
    await client.deactivateWebSpotlight().toPromise();
  },
} as const satisfies EntityDefinition<WebSpotlightContracts.IWebSpotlightStatus>;
