# Sync-Content Run Command

> **⚠️ Caution**
>
> Synchronizing content might lead to irreversible changes in your environment! If the target environment already contains content items or assets with the same identifiers, their content will be **updated** or **overwritten** with the data from the source environment. Proceed with caution and ensure you are aware of the impact on your existing content.

The `sync-content run` command synchronizes **selected content items** and their assets into a **target environment** using the [Kontent.ai Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2/) and the [Kontent.ai Migration Toolkit](https://github.com/kontent-ai/kontent-ai-migration-toolkit). You can manually specify the codenames of content items from the source environment you want to synchronize, or utilize the [Kontent.ai Delivery API](https://kontent.ai/learn/docs/apis/openapi/delivery-api/) to obtain content item codenames based on various criteria.

Before synchronization, the command prints the codenames of the content items that will be affected. We **strongly encourage** you to examine this list carefully before proceeding, as existing content items and assets in the target environment may be updated or overwritten.

## Important Limitations

- **Content Variants and Assets Only**: The synchronization process includes only content items (language variants) and assets. Other entities associated with content items, such as **tasks, assignees, comments, or any workflow-related data**, will **not** be migrated.

- **Existing Associated Entities Remain**: If the target environment's content items have associated entities like tasks, assignees, or comments, these will **not** be removed during synchronization. The synchronization process simply patches the content of the variant, leaving associated entities intact.

## Selecting Content Items to be Synchronized

The command provides several parameters to cover various scenarios for selecting content items from the source environment:

- **Synchronize Specific Items**: Use the `--items` parameter without the `--depth` parameter to synchronize **only** the specified list of content items.

  **Example:**

  ```bash
  npx @kontent-ai/data-ops sync-content run \
    --sourceEnvironmentId=<source-env-id> \
    --sourceApiKey=<source-api-key> \
    --targetEnvironmentId=<target-env-id> \
    --targetApiKey=<target-api-key> \
    --language=<language-codename> \
    --items item1 item2 item3
  ```

- **Synchronize Items with Linked Items**: Use the `--items` parameter along with the `--depth` parameter to synchronize the specified items and their linked items up to the specified depth.

  **Example:**

  ```bash
  npx @kontent-ai/data-ops sync-content run \
    --sourceEnvironmentId=<source-env-id> \
    --sourceApiKey=<source-api-key> \
    --sourceDeliveryPreviewKey=<delivery-preview-key> \
    --targetEnvironmentId=<target-env-id> \
    --targetApiKey=<target-api-key> \
    --language=<language-codename> \
    --items item1 item2 \
    --depth 2
  ```

- **Synchronize Last Modified Items**: Use the `--last` parameter to synchronize the last `x` modified content items. For `x > 2000`, `x` must be divisible by 100, and the `--limit` parameter is set to 100.

  **Example:**

  ```bash
  npx @kontent-ai/data-ops sync-content run \
    --sourceEnvironmentId=<source-env-id> \
    --sourceApiKey=<source-api-key> \
    --sourceDeliveryPreviewKey=<delivery-preview-key> \
    --targetEnvironmentId=<target-env-id> \
    --targetApiKey=<target-api-key> \
    --language=<language-codename> \
    --last 500
  ```

- **Synchronize by Content Type**: Use the `--byTypeCodename` parameter to synchronize content items filtered by the specified content types.

  **Example:**

  ```bash
  npx @kontent-ai/data-ops sync-content run \
    --sourceEnvironmentId=<source-env-id> \
    --sourceApiKey=<source-api-key> \
    --sourceDeliveryPreviewKey=<delivery-preview-key> \
    --targetEnvironmentId=<target-env-id> \
    --targetApiKey=<target-api-key> \
    --language=<language-codename> \
    --byTypeCodename article blog_post
  ```

- **Custom Query Filtering**: Use the `--filter` parameter to apply a custom query string for filtering content items. Refer to the [Kontent.ai Delivery API documentation](https://kontent.ai/learn/docs/apis/openapi/delivery-api/) for query options.

  **Example:**

  ```bash
  npx @kontent-ai/data-ops sync-content run \
    --sourceEnvironmentId=<source-env-id> \
    --sourceApiKey=<source-api-key> \
    --sourceDeliveryPreviewKey=<delivery-preview-key> \
    --targetEnvironmentId=<target-env-id> \
    --targetApiKey=<target-api-key> \
    --language=<language-codename> \
    --filter "elements.category[contains]=news"
  ```
> **Important Notes:**
>
> - The parameters above are **mutually exclusive**. Use only one of them at a time.
> - When using parameters that utilize the Delivery API (`--last`, `--byTypeCodename`, `--filter`, or when using `--items` with `--depth`), you need to provide a valid Delivery Preview API Key using the `--sourceDeliveryPreviewKey` (or shorthand `--sd`) parameter.
> - All commands support optional `--depth` and `--limit` parameters affecting the depth of linked items selection and response size. When specifying the `--depth` parameter, we encourage you to use the `--limit` parameter appropriately to prevent hitting the upper limit for Delivery API response size. For more information, refer to the [Kontent.ai Delivery API documentation](https://kontent.ai/learn/docs/apis/openapi/delivery-api/#section/Response-size).

## Parameters

| Parameter                            | Description                                                                                                                      |
|--------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|
| `--sourceEnvironmentId`              | The ID of the source environment to synchronize content from.                                                                    |
| `--sourceApiKey`                     | The Management API key for the source environment.                                                                               |
| `--sourceDeliveryPreviewKey`, `--sd` | (Required when using Delivery API parameters) The Delivery Preview API key for the source environment.                           |
| `--targetEnvironmentId`              | The ID of the target environment where content will be synchronized to.                                                          |
| `--targetApiKey`                     | The Management API key for the target environment.                                                                               |
| `--language`                         | The codename of the language variant to synchronize.                                                                             |
| `--items`                            | (Mutually exclusive) A list of content item codenames to synchronize.                                                            |
| `--last`                             | (Mutually exclusive) The number of last modified content items to synchronize.                                                   |
| `--byTypeCodename`                   | (Mutually exclusive) A list of content type codenames to filter content items.                                                   |
| `--filter`                           | (Mutually exclusive) A custom query string for filtering content items via the Delivery API.                                     |
| `--depth`                            | (Optional) The depth of linked items to include in the synchronization.                                                          |
| `--limit`                            | (Optional) The maximum number of content items to retrieve per API call (default is 100, maximum is 100).                        |
| `--configFile`                       | (Optional) Path to a JSON configuration file containing parameters.                                                             |

To see all supported parameters, run:

```bash
npx @kontent-ai/data-ops@latest sync-content run --help
```

## Synchronizing Content Programmatically

To synchronize content between environments in your scripts, use the `syncContentRun` function:

```typescript
import { syncContentRun, SyncContentRunParams } from "@kontent-ai/data-ops";

const params: SyncContentRunParams = {
  sourceEnvironmentId: "<source-env-id>",
  sourceApiKey: "<source-api-key>",
  sourceDeliveryPreviewKey: "<delivery-preview-key>", // Required if using Delivery API parameters
  targetEnvironmentId: "<target-env-id>",
  targetApiKey: "<target-api-key>",
  language: "en-US",
  items: ["article1", "article2"],
  // depth: 2,
  // limit: 100,
};

await syncContentRun(params);
```

## Additional Notes

- **Content Overwrite Warning**: Synchronizing content items and assets will **overwrite** existing content in the target environment if items with the same identifiers (e.g., codenames) exist. Ensure that overwriting existing content is the intended behavior before proceeding.

- **Associated Entities Not Migrated**: The synchronization process includes only content items (language variants) and assets. Other entities associated with content items, such as **tasks, assignees, comments, or any workflow-related data**, will **not** be migrated.

- **Existing Associated Entities Remain**: If the target environment's content items have associated entities like tasks, assignees, or comments, these will **not** be removed during synchronization. The synchronization process simply patches the content of the variant, leaving associated entities intact.

- **Review Affected Items**: Before synchronization, the command will print the codenames of the content items that will be affected. Carefully review this list to ensure you are synchronizing the correct items.

- **Mutually Exclusive Parameters**: The content selection parameters (`--items`, `--last`, `--byTypeCodename`, `--filter`) are mutually exclusive. Use only one per command.

- **API Keys Security**: Handle your API keys securely. Do not expose them in version control systems or logs.

- **Delivery API Limits**: Be mindful of the Delivery API's response size limits when using `--depth` and `--limit`. Adjust these parameters to prevent exceeding maximum response size.
