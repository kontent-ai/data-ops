# Sync Snapshot Command

The `sync snapshot` command is an essential part of the content model & environment metadata synchronization process (see the [`sync run`](../run/README.md) command). It allows you to generate a local snapshot of the desired entities from a specified Kontent.ai environment. The snapshot is saved into a local folder and can be used as the **source for subsequent synchronization or diff operations**.

## Why Snapshot Your Environment before Syncing?

- **Stability and Consistency**: By creating a stable snapshot of your content model & environment metadata, you ensure that the selected entites remains unchanged between diffing and the synchronization. This prevents discrepancies that can occur if changes are made in the source environment during these operations.
   
- **Safety**: It allows you to review and, if necessary, adjust the snapshot entities before applying changes to the target environment.
  
- **Efficiency**: Reduces the need for constant access to the source environment during synchronization, which can be beneficial in environments with restricted access or when automating deployment processes.

## Supported Entities

The snapshot is cabable of containing following entities:

- **Content Types**
- **Content Type Snippets**
- **Taxonomies**
- **Web Spotlight**
- **Asset Folders**
- **Collections**
- **Spaces**
- **Languages**
- **Workflows**

To successfully snapshot your environment, ensure your MAPI key has the necessary permissions. For more information about API keys, visit our [learn portal](https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/API-keys).

> [!NOTE]
> To snapshot Web Spotlight settings, your MAPI key needs to have the Manage Environments permission enabled.

## How It Works

The generated snapshot follows the [Management API (MAPI)](https://kontent.ai/learn/docs/apis/openapi/management-api-v2/) format and is processed to remove IDs and other non-essential fields like `last_modified`. References to other entities (e.g., a snippet within a snippet element) are updated to use `codename` instead of `id`. Additionally:
  
- Custom properties such as `data-asset-codename`, `data-item-codename`, and `data-codename` are included for convenience when referencing items and assets inside guidelines' rich text. These properties are removed and transformed to the corresponding IDs or external IDs during synchronization.

> [!CAUTION]
>
> If you manually adjust the content within the snapshot folder, ensure that the content model remains in a valid state to prevent errors during synchronization.

## Usage

```bash
npx @kontent-ai/data-ops@latest sync snapshot \
  --environmentId <environment-id> \
  --apiKey <Management-API-key> \
  --folderName <output-folder> \
  --entities contentTypes contentTypeSnippets taxonomies
```

### Using a Configuration File**

Create a `config.json` file:

```json
{
  "environmentId": "<environment-id>",
  "apiKey": "<Management-API-key>",
  "folderName": "./my-content-model",
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

Run the command:

```bash
npx @kontent-ai/data-ops@latest sync snapshot --configFile config.json
```

### Parameters

| Parameter          | Description                                                           |
|--------------------|-----------------------------------------------------------------------|
| `--environmentId`  | The ID of the environment to export the content model from.           |
| `--apiKey`         | The Management API key for the source environment.                    |
| `--entities`       | List of entities to include in the snapshot (`contentTypes`,`contentTypeSnippets`, `taxonomies`, `collections`, `assetFolders`, `spaces`, `languages`,`webSpotlight`, `workflows`).                                                                                |
| `--folderName`   | (Optional) The path to the folder where the content model will be saved. Defaults to `<date>-<environmentId>`. |
| `--configFile`     | (Optional) Path to a JSON configuration file containing parameters.   |


### Example

**Creating the Content Model Snapshot in a Specific Folder**

```bash
npx @kontent-ai/data-ops@latest sync snapshot \
  --environmentId <environment-id> \
  --apiKey <Management-API-key> \
  --folderName ./my-content-model \
  --entities contentTypes contentTypeSnippets taxonomies
```

## Creating a Snapshot Programmatically

You can create an environment snapshotin your scripts using the `syncSnapshot` function:

```typescript
import { syncSnapshot, SyncSnapshotParams } from "@kontent-ai/data-ops";

const params: SyncSnapshotParams = {
  environmentId: "<env-id>",
  apiKey: "<mapi-key>",
  folderName: "./my-content-model",
  entities: {
    contentTypes: () => true, // Synchronize all content types
    taxonomies: (taxonomy) => taxonomy.codename.startsWith('category_'), // Synchronize specific taxonomies
    languages: (language) => language.codename === "default" // Synchronize only the default language
  }
};

await syncSnapshot(params);
```

### Advanced Filtering

When creating a snapshot programmatically, you can provide custom filter functions for each entity type:

```typescript
entities: {
  contentTypes: (contentType) => contentType.codename !== 'obsolete_type',
  taxonomies: (taxonomy) => taxonomy.terms.length > 0,
  // Other entities...
}
```
