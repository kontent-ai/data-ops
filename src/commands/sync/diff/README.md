# Sync Diff Command

The `sync diff` command compares two environments and outputs the differences either to the command line interface (CLI) or to a standalone HTML file for improved visual representation and sharing purposes. You can compare two environments directly by providing parameters for both the source and target (environment IDs and Management API keys). Alternatively, you can compare an environment with a local snapshot created by the [`sync snapshot`](../snapshot/README.md) command.

## Default Output

By default, the `sync diff` command outputs the differences to the CLI in a format similar to [Kontent.ai Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2/) operations for each modified entity. This is suitable for smaller diffs or when you want to inspect individual operations in detail.

## Advanced Output

By specifying the `-a` or `--advanced` flag in the `sync diff` command, you can generate a visual diff instead. This will create an HTML file at a path specified by the `-o` or `--outPath` parameter (required if `--advanced` is used). By default, the generated diff file will open automatically upon completion. You can suppress this behavior by using the `-n` or `--noOpen` flag.

The advanced output is a stylized, interactive overview of all the differences between the two content models. It includes the total number and types of changes to individual entity types, along with detailed information on each modified entity and its changeset, emphasizing human readability.

> [!Tip]
>
> You can specify both directory and file paths with the `-o` parameter. If you provide a file path (with a `.html` suffix), the generated diff will have the name you specify. For directory paths, a default naming convention will be used (`diff_<current UTC dateTime>.html`).
>
> In both cases, directories along the path are created automatically if they don't exist yet.

### Example of Advanced Output

![Visual Diff Showcase](https://github.com/kontent-ai/data-ops/assets/52500882/4c85b987-3343-4bad-bd34-1888c506397d)

## Usage

You can use the `sync diff` command in two ways:

### Comparing Two Environments Directly

```bash
npx @kontent-ai/data-ops@latest sync diff \
  --targetEnvironmentId <target-environment-id> \
  --targetApiKey <target-management-api-key> \
  --sourceEnvironmentId <source-environment-id> \
  --sourceApiKey <source-management-api-key> \
  [--entities <list-of-entities-to-compare>] \
  [--advanced] [--noOpen] [--outPath <output-path>]
```

### Comparing an Environment with a Local Content Model Folder

```bash
npx @kontent-ai/data-ops@latest sync diff \
  --targetEnvironmentId <target-environment-id> \
  --targetApiKey <target-management-api-key> \
  --folderName <content-model-folder> \
  [--entities <list-of-entities-to-compare>] \
  [--advanced] [--noOpen] [--outPath <output-path>]
```

### Parameters

| Parameter               | Description                                                                                                                                                                |
|-------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `--targetEnvironmentId` | The ID of the target environment to compare.                                                                                                                               |
| `--targetApiKey`        | The Management API key for the target environment.                                                                                                                         |
| `--sourceEnvironmentId` | The ID of the source environment to compare. (Use either this or `--folderName`.)                                                                                          |
| `--sourceApiKey`        | The Management API key for the source environment.                                                                                                                         |
| `--folderName`          | The path to the local content model snapshot created with `sync snapshot`. (Use either this or `--sourceEnvironmentId` and `--sourceApiKey`.)                            |
| `--entities`            | (Optional) List of entities to diff (`contentTypes`,`contentTypeSnippets`,`taxonomies`,`collections`,`assetFolders`,`spaces`,`languages`,`webSpotlight`,`workflows`).                                        |
| `--advanced`, `-a`      | (Optional) Generates an advanced visual diff in HTML format.                                                                                                               |
| `--outPath`, `-o`       | (Required if `--advanced` is used) Specifies the output path for the HTML diff file.                                                                                       |
| `--noOpen`, `-n`        | (Optional) Prevents the generated HTML diff file from opening automatically.                                                                      
| `--configFile`          | (Optional) Path to a JSON configuration file containing parameters.                                                                                                        |

### Examples

**Example 1: Comparing Two Environments (All Entities) with Advanced Output**

```bash
npx @kontent-ai/data-ops@latest sync diff \
  --targetEnvironmentId <target-environment-id> \
  --targetApiKey <target-management-api-key> \
  --sourceEnvironmentId <source-environment-id> \
  --sourceApiKey <source-management-api-key> \
  --advanced \
  --outPath ./diff-report.html
```

**Example 2: Comparing Content Types of an Environment with a Local Snapshot**

First, create the source environment snapshot:

```bash
npx @kontent-ai/data-ops@latest sync export \
  --environmentId <source-environment-id> \
  --apiKey <source-management-api-key> \
  --outputFolder ./source-model
```

Then, perform the diff over the selected entity (must be included in the snapshot):

```bash
npx @kontent-ai/data-ops@latest sync diff \
  --targetEnvironmentId <target-environment-id> \
  --targetApiKey <target-management-api-key> \
  --folderName ./source-model \
  --entities contentTypes
  --advanced \
  --outPath ./diff-report.html
```

### Using `sync diff` Programmatically

To compare environments in your scripts, use the `syncDiff` function:

```typescript
import { syncDiff, SyncDiffParams } from "@kontent-ai/data-ops";
import * as fs from "fs";

const params: SyncDiffParams = {
  targetEnvironmentId: "<target-env-id>",
  targetApiKey: "<target-api-key>",
  // Use either sourceEnvironmentId and sourceApiKey, or folderName
  sourceEnvironmentId: "<source-env-id>",
  sourceApiKey: "<source-api-key>",
  // folderName: "./source-model",
};

const syncDiffHtml = await syncDiff(params);

// (optional) save html
fs.writeFileSync("path-to-store-html", syncDiffHtml);
```