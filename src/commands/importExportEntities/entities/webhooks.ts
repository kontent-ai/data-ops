import { WebhookContracts } from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { logInfo } from "../../../log.js";
import { serially } from "../../../utils/requests.js";
import { FixReferences } from "../../../utils/types.js";
import { EntityDefinition } from "../entityDefinition.js";

type Webhook = FixReferences<WebhookContracts.IWebhookContract>;

export const webhookEntity: EntityDefinition<ReadonlyArray<Webhook>> = {
  name: "webhooks",
  fetchEntities: client => client.listWebhooks().toPromise().then(res => res.rawData as ReadonlyArray<Webhook>),
  serializeEntities: webhooks => JSON.stringify(webhooks),
  deserializeEntities: JSON.parse,
  importEntities: async (client, entities, context, logOptions) => {
    await serially(entities.map(webhook => () => {
      logInfo(logOptions, "verbose", `Importing: webhook ${webhook.id} (${chalk.yellow(webhook.name)})`);

      return client
        .addWebhook()
        .withData({
          name: webhook.name,
          secret: webhook.secret,
          url: webhook.url,
          delivery_triggers: webhook.delivery_triggers,
        }).toPromise();
    }));

    return {
      ...context,
    };
  },
  cleanEntities: async (client, webhooks) => {
    await serially(
      webhooks.map(webhook => () => {
        return client
          .deleteWebhook()
          .byId(webhook.id)
          .toPromise();
      }),
    );
  },
};
