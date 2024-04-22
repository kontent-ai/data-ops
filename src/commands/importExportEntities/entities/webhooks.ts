import { WebhookContracts } from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { logInfo } from "../../../log.js";
import { serially } from "../../../utils/requests.js";
import { ReplaceReferences } from "../../../utils/types.js";
import { EntityDefinition } from "../entityDefinition.js";
import { simplifyContext, transformReferences } from "./utils/referece.js";

type Webhook = ReplaceReferences<WebhookContracts.IWebhookContract>;

export const webhooksEntity: EntityDefinition<ReadonlyArray<Webhook>> = {
  name: "webhooks",
  displayName: "webhooks",
  fetchEntities: client => client.listWebhooks().toPromise().then(res => res.rawData as ReadonlyArray<Webhook>),
  serializeEntities: webhooks => JSON.stringify(webhooks),
  deserializeEntities: JSON.parse,
  importEntities: async (client, entities, context, logOptions) => {
    await serially(
      entities.map((webhook) => () => {
        logInfo(
          logOptions,
          "verbose",
          `Importing: webhook ${webhook.id} (${chalk.yellow(webhook.name)})`,
        );

        return client
          .addWebhook()
          .withData({
            name: webhook.name,
            secret: webhook.secret,
            url: webhook.url,
            enabled: webhook.enabled,
            delivery_triggers: transformReferences(
              webhook.delivery_triggers,
              simplifyContext(context), // TODO: extract only relevant references
            ),
          })
          .toPromise();
      }),
    );

    return {
      ...context,
    };
  },
  cleanEntities: async (client, webhooks) => {
    if (!webhooks.length) {
      return;
    }

    await serially(
      webhooks.map(webhook => () => client.deleteWebhook().byId(webhook.id).toPromise()),
    );
  },
};
