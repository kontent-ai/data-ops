import type { IContentItem } from "@kontent-ai/delivery-sdk";

import { type LogOptions, logInfo } from "../../../log.js";
import { createClientDelivery } from "../../../utils/client.js";
import { fetchItems } from "../../../utils/deliveryHelpers.js";
import { type ToMarkdownOptions, toMarkdown } from "./markdown.js";

export type MarkdownFilterParams = Readonly<
  | { items: ReadonlyArray<string> }
  | (
      | { items: ReadonlyArray<string>; depth: number; limit?: number }
      | ((
          | { last: number }
          | { byTypesCodenames: ReadonlyArray<string> }
          | { filter: string }
          | { collection: string }
        ) & {
          depth?: number;
          limit?: number;
        })
    )
>;

export type FetchItemsToMarkdownParams = Readonly<{
  environmentId: string;
  language: string;
  kontentUrl?: string;
  markdownOptions?: ToMarkdownOptions<IContentItem>;
  previewApiKey?: string;
}> &
  MarkdownFilterParams &
  LogOptions;

export type MarkdownResult = Readonly<{
  codename: string;
  markdown: string;
}>;

export const fetchItemsToMarkdown = async (
  params: FetchItemsToMarkdownParams,
): Promise<ReadonlyArray<MarkdownResult>> => {
  logInfo(params, "standard", `Fetching content items from environment ${params.environmentId}...`);
  const client = createClientDelivery({
    environmentId: params.environmentId,
    previewApiKey: params.previewApiKey,
    usePreviewMode: !!params.previewApiKey,
    commandName: "data-export-markdown",
    baseUrl: params.kontentUrl,
  });

  const responses = await fetchItems(client, params);
  const items = responses.flatMap((r) => r.items);

  logInfo(params, "standard", `Converting ${items.length} items to markdown...`);
  return items.map((item) => ({
    codename: item.system.codename,
    markdown: toMarkdown(item, params.markdownOptions),
  }));
};
