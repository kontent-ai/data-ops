# Sync-Model Export Command

The `sync-model export` command is an essential part of the content model synchronization process (see the [`sync-model run`](../run/README.md) command). It allows you to generate a local snapshot of the content model from a specified Kontent.ai environment, including Content Types, Content Type Snippets, and Taxonomies. This exported content model is saved in a folder and can be used as the source for synchronization or diff operations.

## Why Export Your Content Model?

Exporting your content model provides several benefits:

- **Stability**: By creating a stable snapshot of your content model, you ensure that the model remains unchanged between diffing and synchronization processes. This prevents discrepancies that can occur if changes are made in the source environment during these operations.
  
- **Consistency**: Working with a local copy of the content model guarantees that the diff and sync operations use the exact same data, eliminating the risk of mid-process changes affecting the outcome.
  
- **Safety**: It allows you to review and, if necessary, adjust the content model before applying changes to the target environment.
  
- **Efficiency**: Reduces the need for constant access to the source environment during synchronization, which can be beneficial in environments with restricted access or when automating deployment processes.

Using the exported content model is considered a safer way of synchronizing content models, especially in environments where multiple team members might be making changes.

## How It Works

The generated model follows the [Management API (MAPI)](https://kontent.ai/learn/docs/apis/openapi/management-api-v2/) format and is processed to remove IDs and other non-essential fields like `last_modified`. References to other entities (e.g., a snippet within a snippet element) are updated to use `codename` instead of `id`. Additionally:

- An `external_id` is set for each entity. If an entity already has an `external_id`, its value is preserved. Otherwise, the value of the entity's `id` is used.
  
- Custom properties such as `data-asset-codename`, `data-item-codename`, and `data-codename` are included for convenience when referencing items and assets inside guidelines' rich text. These properties are removed and transformed to the corresponding IDs or external IDs during synchronization.

> **⚠️ Caution**
>
> If you manually adjust the content within the exported folder, ensure that the content model remains in a valid state to prevent errors during synchronization.

## Output Files

A successful execution of the command results in the creation of the following files in the specified output folder:

- `contentTypes.json`
- `contentTypeSnippets.json`
- `taxonomies.json`
- `metadata.json` (contains additional information; not required for synchronization)

## Usage

```bash
npx @kontent-ai/data-ops@latest sync-model export \
  --environmentId <environment-id> \
  --apiKey <Management-API-key> \
  --outputFolder <output-folder>
```

### Parameters

| Parameter          | Description                                                           |
|--------------------|-----------------------------------------------------------------------|
| `--environmentId`  | The ID of the environment to export the content model from.           |
| `--apiKey`         | The Management API key for the source environment.                    |
| `--outputFolder`   | (Optional) The path to the folder where the content model will be saved. Defaults to `./content-model`. |
| `--configFile`     | (Optional) Path to a JSON configuration file containing parameters.   |

### Examples

**Exporting Content Model to a Specific Folder**

```bash
npx @kontent-ai/data-ops@latest sync-model export \
  --environmentId <environment-id> \
  --apiKey <Management-API-key> \
  --outputFolder ./my-content-model
```

**Using a Configuration File**

Create a `config.json` file:

```json
{
  "environmentId": "<environment-id>",
  "apiKey": "<Management-API-key>",
  "outputFolder": "./my-content-model"
}
```

Run the command:

```bash
npx @kontent-ai/data-ops@latest sync-model export \
  --configFile config.json
```

## Exporting Sync-Model Data Programmatically

You can export sync-model data from environments in your scripts using the `syncModelExport` function:

```typescript
import { syncModelExport, SyncModelExportParams } from "@kontent-ai/data-ops";

const params: SyncModelExportParams = {
  environmentId: "<env-id>",
  apiKey: "<mapi-key>",
  outputFolder: "./my-content-model",
};

await syncModelExport(params);
```

## Additional Notes

- **Stability of the Snapshot**: By exporting the content model, you ensure that the snapshot used for diffing and synchronization does not change, even if other team members make changes in the source environment.

- **Avoid Mid-Process Changes**: This approach prevents discrepancies that could occur if the content model changes between the diff and sync operations when comparing environments directly.

- **Manual Adjustments**: If you need to make manual adjustments to the content model files, do so carefully to maintain the integrity and validity of the model.

---

By incorporating the export of the content model into your synchronization workflow, you enhance the reliability and safety of your content model management, especially in collaborative environments.