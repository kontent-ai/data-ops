import { WebhookContracts } from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { logInfo } from "../../../log.js";
import { serially } from "../../../utils/requests.js";
import { FixReferences } from "../../../utils/types.js";
import { EntityDefinition, SimplifiedImportContext } from "../entityDefinition.js";

type Webhook = FixReferences<WebhookContracts.IWebhookContract>;

export const webhooksEntity: EntityDefinition<ReadonlyArray<Webhook>> = {
  name: "webhooks",
  fetchEntities: (client) =>
    client
      .listWebhooks()
      .toPromise()
      .then((res) => res.rawData as ReadonlyArray<Webhook>),
  serializeEntities: (webhooks) => JSON.stringify(webhooks),
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
              context as unknown as SimplifiedImportContext,
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
    await serially(
      webhooks.map((webhook) => () => {
        return client.deleteWebhook().byId(webhook.id).toPromise();
      }),
    );
  },
};

const transformReferences = <T extends object>(
  object: Transformable<T>,
  context: SimplifiedImportContext,
): T => {
  const findInContext = (key: string): string | undefined => {
    let mapKey: keyof SimplifiedImportContext;
    for (mapKey in context) {
      if (context[mapKey].has(key)) {
        return context[mapKey].get(key);
      }
    }
    return undefined;
  };

  const traverseAndReplace = (value: Transformable<T>): Transformable<any> => {
    switch (typeof value) {
      case "string":
        return findInContext(value) ?? value;
      case "object":
        if (Array.isArray(value)) {
          return value.map((item) => traverseAndReplace(item));
        } else {
          return Object.keys(value).reduce<Transformable<any>>((acc, key) => {
            acc[key] = traverseAndReplace(value[key]);
            return acc;
          }, {});
        }
      default:
        return value;
    }
  };

  return traverseAndReplace(object);
};

type Transformable<T> = T extends object ?
    & {
      [P in keyof T]: Transformable<T[P]>;
    }
    & { [index: string]: Transformable<any> }
  : T;
