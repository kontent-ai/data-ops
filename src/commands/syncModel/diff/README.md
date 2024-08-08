# sync-model diff
The `sync-model diff` command compares **content models** of two environments and outputs the difference either to a command line interface or to a standalone HTML file for improved visual representation and sharing purposes. Two environments can be compared to each other directly by providing parameters for both source and target (environment ID and MAPI key). Alternatively, you can also compare the target environment with a folder model created by [sync-model export](../export/README.md) command.

## Default output

By default, `sync-model diff` command outputs to CLI, in a slightly altered format of [Kontent.ai Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2/) operations for each modified entity. This can be suitable for smaller diffs or if you want to inspect individual operations.

## Advanced output

By specifying the `-a, --advanced` flag in the `sync-model diff` command, you can opt for visual diff instead. This will generate an HTML file at a path specified by `-o, --outPath` parameter (mandatory if `-a` is used). The generated diff file should open automatically if the process succeeds. You can suppress automatic file opening by using `-n, --noOpen` flag.

Advanced output comes in the form of a stylized, interactive overview of all the differences between two content models. It includes the total number and types of changes to individual entity types, along with detailed information on each modified entity and its changeset, with emphasis on human-readability.

> [!TIP]
> You can specify both directory and file paths with `-o` parameter. If you provide a file path (with `.html` suffix), the generated diff will have the name of your choice. For directory paths, a default naming convention will be used (`diff_<current UTC dateTime>.html`). 
>
> In both cases, directories along the path are created automatically if they don't exist yet.

### Showcase

![visual-diff-showcase](https://github.com/kontent-ai/data-ops/assets/52500882/4c85b987-3343-4bad-bd34-1888c506397d)

## Usage

```bash
npx @kontent-ai/data-ops@latest sync-model diff --targetEnvironmentId <environment-id> --targetApiKey <Management-API-key> --sourceEnvironmentId <source-environment-id> --sourceApiKey <Management-API-key> [--advanced] [--noOpen] [--outPath] <absolute-folder-path>
```

Or

```bash
npx @kontent-ai/data-ops@latest sync-model diff --targetEnvironmentId <environment-id> --targetApiKey <Management-API-key> --folderName <content-model-folder> [--advanced] [--noOpen] [--outPath] <absolute-folder-path>
```

### Diff environments programmatically

To diff your environments in your scripts, use `diffEnvironments` function:

```ts
import { diffEnvironments, DiffEnvironmentsParams } from "@kontent-ai/data-ops";

const params: DiffEnvironmentsParams = {
  sourceEnvironmentId: "<source-env-id>",
  sourceApiKey: "<source-mapi-key>",
  targetEnvironmentId: "<target-env-id>",
  targetApiKey: "<target-mapi-key>",
};

await diffEnvironments(params);
```
