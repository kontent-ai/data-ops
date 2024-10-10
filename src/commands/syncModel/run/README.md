# Sync-Model Run Command

> **⚠️ Caution**
>
> Synchronizing the content model can lead to irreversible changes in the target environment, such as:
>
> - **Deletion of content** by removing elements from content types.
> - **Deletion of used taxonomies**.
> - **Removal of role limitations** in workflows (see [Known Limitations](#known-limitations)).
>
> Proceed with caution and consider backing up your environment or testing in a non-production environment first.

The `sync-model run` command synchronizes the **source content model** into the **target environment** using the [Kontent.ai Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2/). This command is essential for maintaining consistency across environments (e.g., Development, Staging, Production) by updating the content model in the target environment to match the source.

## Why Use `sync-model run`?

- **Environment Consistency**: Ensure that content models are identical across environments, preventing issues caused by discrepancies.
- **Deployment Automation**: Automate content model updates as part of your CI/CD pipeline.
- **Team Collaboration**: Allow multiple team members to work on content models in different environments and synchronize changes efficiently.

## Source Content Model Options

You can obtain the source content model in two ways:

1. **From an Existing Kontent.ai Environment**: Provide the source environment ID and Management API key to fetch the content model directly.
2. **From a Local Folder**: Use a local folder containing the content model exported using the [`sync-model export`](../export/README.md) command.

**Using a local snapshot of the content model is the recommended approach**, as it creates a stable snapshot that won't change during the synchronization process. This prevents discrepancies that can occur if changes are made in the source environment between diffing and syncing.

## Key Features

- **Selective Synchronization**: Specify which entities to synchronize using the mandatory `--entities` parameter.
- **Pre-Sync Validation**: Performs validation checks to prevent operations that could cause errors or data loss.
- **Change Preview (Diff)**: Generates and displays a diff of the changes before applying them, allowing you to review and confirm.

## Supported Entities

The following entities can be synchronized:

- **Content Types**
- **Content Type Snippets**
- **Taxonomies**
- **Web Spotlight**
- **Asset Folders**
- **Collections**
- **Spaces**
- **Languages**
- **Workflows**

## Important Considerations

- **Entity Matching**: Entities are matched by their `codename`.
- **Partial Synchronization**: Ensure all dependent entities are included or already exist in the target environment.
- **No External ID Synchronization**: `external_id` properties are not synchronized to avoid conflicts.
- **Guidelines References**: References to items or assets not present in the target environment will use `external_id` after synchronization.

## Conditions for Successful Synchronization

Before running the synchronization, ensure:

- **No Element Type Changes**: Changing the type of an existing element is not allowed.
- **No Deletion of Used Content Types**: Cannot delete content types with existing content items.
- **No Deletion of Used Collections**: Cannot delete collections containing content items.
- **No References to Deleted Taxonomies**: The source model should not reference deleted taxonomies.
- **Valid Content Model**: If using a folder, ensure the content model files are valid and correctly structured.

## Known Limitations

- **Snippet Elements**: Cannot reference snippet elements in the same request they're created.
- **Asset Folders**:
  - Cannot be moved; they are deleted and recreated if structure differs.
  - Cannot be deleted if containing assets; ensure folders to be deleted are empty.
- **Languages**: Cannot be deleted; they are deactivated and renamed with a UUID.
- **Roles and Workflows**:
  - Roles cannot be added or updated via the API.
  - Role assignments in workflows cannot be synchronized; role restrictions are lost when updating workflows.

## Usage

### Synchronizing from Environments

```bash
npx @kontent-ai/data-ops@latest sync-model run \
  --targetEnvironmentId=<target-env-id> \
  --targetApiKey=<target-api-key> \
  --sourceEnvironmentId=<source-env-id> \
  --sourceApiKey=<source-api-key> \
  --entities contentTypes contentTypeSnippets taxonomies
```

### Synchronizing from a Local Folder (Recommended)

First, export the content model:

```bash
npx @kontent-ai/data-ops@latest sync-model export \
  --environmentId=<source-env-id> \
  --apiKey=<source-api-key> \
  --outputFolder=./content-model
```

Then, synchronize to the target environment:

```bash
npx @kontent-ai/data-ops@latest sync-model run \
  --targetEnvironmentId=<target-env-id> \
  --targetApiKey=<target-api-key> \
  --folderName=./content-model \
  --entities contentTypes contentTypeSnippets taxonomies
```

### Using a Configuration File

Create a `params.json` file:

```json
{
  "targetEnvironmentId": "<target-env-id>",
  "targetApiKey": "<target-api-key>",
  "folderName": "./content-model",
  "entities": [
    "contentTypes",
    "contentTypeSnippets",
    "taxonomies",
    "collections",
    "assetFolders",
    "spaces",
    "languages",
    "webSpotlight",
    "workflows"
  ]
}
```

Run the command with the configuration file:

```bash
npx @kontent-ai/data-ops@latest sync-model run --configFile params.json
```

### Parameters

| Parameter                | Description                                                                                                  |
|--------------------------|--------------------------------------------------------------------------------------------------------------|
| `--targetEnvironmentId`  | The ID of the target environment where the content model will be synchronized.                                |
| `--targetApiKey`         | The Management API key for the target environment.                                                           |
| `--sourceEnvironmentId`  | (Optional) The ID of the source environment to fetch the content model from.                                  |
| `--sourceApiKey`         | (Optional) The Management API key for the source environment.                                                 |
| `--folderName`           | (Optional) Path to the folder containing the exported content model.                                          |
| `--entities`             | List of entities to synchronize (e.g., `contentTypes`, `taxonomies`).                                         |
| `--configFile`           | (Optional) Path to a JSON configuration file containing parameters.                                           |

**Note**: Use either `--sourceEnvironmentId` and `--sourceApiKey`, or `--folderName`, not both.

### Examples

**Synchronize Content Types and Taxonomies Only**

```bash
npx @kontent-ai/data-ops@latest sync-model run \
  --targetEnvironmentId=<target-env-id> \
  --targetApiKey=<target-api-key> \
  --folderName=./content-model \
  --entities contentTypes taxonomies
```

### Viewing Help

To see all supported parameters, run:

```bash
npx @kontent-ai/data-ops@latest sync-model run --help
```

## Sync Model Programmatically

You can synchronize the content model within your scripts using the `syncModelRun` function:

```typescript
import { syncModelRun, SyncModelRunParams } from "@kontent-ai/data-ops";

const params: SyncModelRunParams = {
  targetEnvironmentId: "<target-env-id>",
  targetApiKey: "<target-api-key>",
  // Use either sourceEnvironmentId and sourceApiKey, or folderName
  // sourceEnvironmentId: "<source-env-id>",
  // sourceApiKey: "<source-api-key>",
  folderName: "./content-model",
  entities: {
    contentTypes: () => true, // Synchronize all content types
    taxonomies: (taxonomy) => taxonomy.codename.startsWith('category_'), // Synchronize specific taxonomies
    languages: (language) => language.codename === "default" // Synchronize only the default language
  }
};

await syncModelRun(params);
```

### Advanced Filtering

When synchronizing programmatically, you can provide custom filter functions for each entity type:

```typescript
entities: {
  contentTypes: (contentType) => contentType.codename !== 'obsolete_type',
  taxonomies: (taxonomy) => taxonomy.terms.length > 0,
  // Other entities...
}
```

## Additional Notes

- **Review Changes**: Always review the diff generated before synchronization to understand the changes that will be applied.
- **Backup**: Consider exporting the target environment's content model before synchronization as a backup.
- **Testing**: Test the synchronization in a non-production environment to ensure it behaves as expected.
- **Dependencies**: Ensure that all dependencies (e.g., referenced taxonomies, content types) are included or exist in the target environment.

## Common Use Cases

- **Promoting Changes**: Move content model changes from Development to Production environments.
- **Environment Refresh**: Keep Staging and Development environments in sync with Production.
- **Automation**: Integrate content model synchronization into CI/CD pipelines.

## Troubleshooting

- **Validation Errors**: If synchronization fails due to validation errors, check the error messages and ensure all conditions are met.
- **Missing Dependencies**: Ensure all dependent entities are included or exist in the target environment.
- **API Rate Limits**: Be aware of Kontent.ai API rate limits when synchronizing large content models.

---

By following these guidelines and understanding the potential impacts, you can effectively use the `sync-model run` command to synchronize content models between environments, ensuring consistency and streamlining your content management workflows.

---
## Contributing

To successfully patch a content type, its operations for content groups and elements must be in a specific order:

![Content Type Operations Order](./images/content_type_operations_order.png)

### Taxonomy Diff Handler

Taxonomies are handled as a flat array of terms with each term having an additional property `position` that encodes its position in the tree.

The `position` property is an array of term codenames starting from the term's parent up to the root term (a taxonomy group child).

Since the terms are flattened in pre-order (parent is before its children), moving a term into an added term is not an issue, as the parent term will be processed before the moved term (added first).

Similarly, remove operations in the array handler are added at the end, so moving a term from a removed term is also not a problem.
