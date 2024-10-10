# Sync-Content Export Command

The `sync-content export` command allows you to export **selected content items** along with their assets from a **source Kontent.ai environment** into a file. It utilizes the [Kontent.ai Migration Toolkit](https://github.com/kontent-ai/kontent-ai-migration-toolkit). You can manually specify the codenames of content items you want to export, or leverage the [Kontent.ai Delivery API](https://kontent.ai/learn/docs/apis/openapi/delivery-api/) to obtain content item codenames based on your own criteria.

> [!Note]
>
> For more information about the format of exported items, refer to the [Kontent.ai Migration Toolkit](https://github.com/kontent-ai/kontent-ai-migration-toolkit) repository.

## Selecting Content Items Using the Delivery API

The command provides several parameters to cover various scenarios for selecting content items from the source environment:

- **Obtain Specific Items**: Use the `--items` parameter without the `--depth` parameter to export **only** the specified list of content items.

  **Example:**

  ```bash
  npx @kontent-ai/data-ops@latest sync-content export \
    --sourceEnvironmentId=<source-environment-id> \
    --sourceApiKey=<source-api-key> \
    --language=<language-codename> \
    --items item1 item2 item3
  ```

- **Obtain Items with Linked Items**: Use the `--items` parameter along with the `--depth` parameter to export the specified items and their linked items up to the specified depth.

  **Example:**

  ```bash
  npx @kontent-ai/data-ops@latest sync-content export \
    --sourceEnvironmentId=<source-environment-id> \
    --sourceApiKey=<source-api-key> \
    --language=<language-codename> \
    --items item1 item2 \
    --depth 2
  ```

- **Obtain Last Modified Items**: Use the `--last` parameter to export the last `x` modified content items. If you need to obtain more than 2,000 items, `x` must be divisible by 100, and the `--limit` parameter is set to 100.

  **Example:**

  ```bash
  npx @kontent-ai/data-ops@latest sync-content export \
    --sourceEnvironmentId=<source-environment-id> \
    --sourceApiKey=<source-api-key> \
    --sourceDeliveryPreviewKey=<delivery-preview-key> \
    --language=<language-codename> \
    --last 500
  ```

- **Obtain Items by Content Type**: Use the `--byTypeCodename` parameter to export content items filtered by the specified content types.

  **Example:**

  ```bash
  npx @kontent-ai/data-ops@latest sync-content export \
    --sourceEnvironmentId=<source-environment-id> \
    --sourceApiKey=<source-api-key> \
    --sourceDeliveryPreviewKey=<delivery-preview-key> \
    --language=<language-codename> \
    --byTypeCodename article blog_post
  ```

- **Custom Query Filtering**: Use the `--filter` parameter to apply a custom query string for filtering content items. Refer to the [Kontent.ai Delivery API documentation](https://kontent.ai/learn/docs/apis/openapi/delivery-api/) for query options.

  **Example:**

  ```bash
  npx @kontent-ai/data-ops@latest sync-content export \
    --sourceEnvironmentId=<source-environment-id> \
    --sourceApiKey=<source-api-key> \
    --sourceDeliveryPreviewKey=<delivery-preview-key> \
    --language=<language-codename> \
    --filter "elements.category[contains]=news"
  ```

> **Important Notes:**
>
> - The parameters above are **mutually exclusive**. Use only one of them at a time.
> - When using parameters that utilize the Delivery API (`--last`, `--byTypeCodename`, `--filter`), you need to provide a valid Delivery Preview API Key using the `--sourceDeliveryPreviewKey` (or shorthand `--sd`) parameter.
> - All commands support optional `--depth` and `--limit` parameters that affect the depth of linked items and response size. When specifying the `--depth` parameter, we encourage you to use the `--limit` parameter appropriately to prevent hitting the upper limit for Delivery API response size. For more information, refer to the [Kontent.ai Delivery API documentation](https://kontent.ai/learn/docs/apis/openapi/delivery-api/#section/Response-size).

## Parameters

| Parameter                          | Description                                                                                                                                       |
|------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| `--sourceEnvironmentId`            | The ID of the source environment from which to export content.                                                                                   |
| `--sourceApiKey`                   | The Management API key for the source environment.                                                                                               |
| `--language`                       | The codename of the language variant to export.                                                                                                  |
| `--items`                          | (Mutually exclusive) A list of content item codenames to export.                                                                                 |
| `--last`                           | (Mutually exclusive) The number of last modified content items to export.                                                                         |
| `--byTypeCodename`                 | (Mutually exclusive) A list of content type codenames to filter content items.                                                                    |
| `--filter`                         | (Mutually exclusive) A custom query string for filtering content items via the Delivery API.                                                      |
| `--depth`                          | (Optional) The depth of linked items to include in the export.                                                                                    |
| `--limit`                          | (Optional) The maximum number of content items to retrieve per API call (default is 100, maximum is 100).                                          |
| `--sourceDeliveryPreviewKey`, `--sd` | The Delivery Preview API key for the source environment. Required when using parameters that utilize the Delivery API.                           |
| `--configFile`                     | (Optional) Path to a JSON configuration file containing parameters.                                                                              |
| `--fileName`                       | (Optional) The name of the output file. Default is `contentExport.zip`.                                                                           |

## Exporting Data Programmatically

To export content data from your environment in your scripts, use the `syncContentExport` function:

```typescript
import { syncContentExport, SyncContentExportParams } from "@kontent-ai/data-ops";

const params: SyncContentExportParams = {
  sourceEnvironmentId: "<source-env-id>",
  sourceApiKey: "<source-api-key>",
  language: "en-US",
  items: ["article1", "article2"],
  // Optionally, include other parameters
  // depth: 1,
  // limit: 100,
  // sourceDeliveryPreviewKey: "<delivery-preview-key>",
};

await syncContentExport(params);
```

## Export from External Systems

If you want to export content from external systems and make it importable by data-ops, you can follow the instructions in the [Kontent.ai Migration Toolkit](https://github.com/kontent-ai/kontent-ai-migration-toolkit/). This repository also provides a [sample script](https://github.com/kontent-ai/kontent-ai-migration-toolkit/blob/main/samples/migrate-from-external-system.ts) demonstrating how to migrate content from external systems.

## Additional Notes

- **Mutually Exclusive Parameters**: The content selection parameters (`--items`, `--last`, `--byTypeCodename`, `--filter`) are mutually exclusive. Use only one of these parameters per command.
- **API Keys Security**: Ensure that you handle API keys securely. Do not expose them in version control systems or logs.
- **Content Dependencies**: When exporting content items with linked items, ensure that the linked items are included in the export by setting the appropriate `--depth`.
