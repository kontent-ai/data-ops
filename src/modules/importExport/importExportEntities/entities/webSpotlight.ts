import { WebSpotlightContracts } from "@kontent-ai/management-sdk";

import { EntityDefinition } from "../entityDefinition.js";

export const webSpotlightEntity: EntityDefinition<WebSpotlightContracts.IWebSpotlightStatus> = {
  name: "webSpotlight",
  displayName: "webSpotlight",
  fetchEntities: client => client.checkWebSpotlightStatus().toPromise().then(res => res.rawData),
  serializeEntities: JSON.stringify,
  importEntities: async (client, fileWebSpotlight, context) => {
    if (fileWebSpotlight.enabled) {
      await client.activateWebSpotlight().withData({ root_type: fileWebSpotlight.root_type }).toPromise();
    } else {
      await client.deactivateWebSpotlight().toPromise();
    }

    return context;
  },
  deserializeEntities: JSON.parse,
  cleanEntities: async client => {
    await client.deactivateWebSpotlight().toPromise();
  },
};
