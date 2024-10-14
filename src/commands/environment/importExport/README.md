# Export & Import

## Export Command

With the `export` command, you can export data from your Kontent.ai environment into a single `.zip` file. The command uses the [Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2) to retrieve the environment data.

### Usage

```bash
npx @kontent-ai/data-ops@latest export --environmentId=<environment-id> --apiKey=<Management-API-key>
```

To see all supported parameters, run:

```bash
npx @kontent-ai/data-ops@latest export --help
```

### Parameters

| Parameter         | Description                                                                       |
|-------------------|-----------------------------------------------------------------------------------|
| `--environmentId` | The ID of the environment you want to export data from.                           |
| `--apiKey`        | The Management API key for the environment.                                       |
| `--fileName`      | (Optional) The name of the output `.zip` file. Default is `export.zip`.           |
| `--include`       | (Optional) Specify entities to include in the export.                             |
| `--exclude`       | (Optional) Specify entities to exclude from the export.                           |
| `--configFile`    | (Optional) Path to a JSON configuration file containing parameters.               |

### Examples

**Exporting All Data from an Environment**

```bash
npx @kontent-ai/data-ops@latest export \
  --environmentId=<environment-id> \
  --apiKey=<Management-API-key>
```

**Exporting Data Excluding Roles**

```bash
npx @kontent-ai/data-ops@latest export \
  --environmentId=<environment-id> \
  --apiKey=<Management-API-key> \
  --exclude roles
```

### Export Programmatically

To export data from an environment in your scripts, use the `exportEnvironment` function:

```typescript
import { exportEnvironment, ExportEnvironmentParams } from "@kontent-ai/data-ops";

const params: ExportEnvironmentParams = {
  environmentId: "<env-id>",
  apiKey: "<mapi-key>",
  // Optional: specify output file name
  // fileName: "export.zip",
  // Optional: include or exclude specific entities
  // include: ["contentItems", "assets"],
  // exclude: ["roles"],
};

await exportEnvironment(params);
```

### Structure of the Exported Data

The exported `.zip` package contains a `.json` file for each exported entity and a `metadata.json` file with additional information. The format of all entities is compatible with the output of the [Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2/).

> [!TIP]
>
> If you need the data in a different format, you can process the `.zip` data with other tools to transform it according to your requirements.

```
- output.zip
  |- assetFolders.json          # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Asset-folders
  |- assets/
     |- [asset files named <assetId>-<fileName>]
  |- assets.json                # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Assets
  |- contentItems.json          # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Content-items
  |- contentTypeSnippets.json   # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Content-type-snippets
  |- languageVariants.json      # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Language-variants
  |- languages.json             # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Languages
  |- metadata.json              # Contains version, timestamp, environmentId
  |- previewUrls.json           # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Preview-URLs
  |- roles.json                 # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Roles
  |- workflows.json             # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Workflows
  |- webSpotlight.json          # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Web-spotlight
```

You can check out exported data of an example project in [the data for integration tests](https://github.com/kontent-ai/data-ops/blob/main/tests/integration/importExport/data/exportSnapshot.zip).

> [!CAUTION]
>
> Exporting roles requires the [Enterprise plan](https://kontent.ai/pricing).
>
> To avoid exporting roles, you can specify the `--exclude roles` parameter or specify only the desired entities using the `--include` parameter.
>
> **Example:**
>
> ```bash
> npx @kontent-ai/data-ops@latest export \
>   --environmentId=<environment-id> \
>   --apiKey=<Management-API-key> \
>   --exclude roles
> ```

---

## Import Command

With the `import` command, you can import data into your Kontent.ai environment. The command uses the [Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2) to import the data.

> [!CAUTION]
>
> **The target environment needs to be empty**, otherwise the command might fail (e.g., when there are entities with the same codename already present).

> [!TIP]
>
> The command requires the import data in a `.zip` file with the same [structure](#structure-of-the-exported-data) as that produced by the [export command](#export).
>
> To import data from a different structure, you can transform it into the supported format using a tool of your choice.

### Usage

```bash
npx @kontent-ai/data-ops@latest import --fileName <file-to-import> --environmentId <target-environment-id> --apiKey <Management-API-key>
```

### Parameters

| Parameter         | Description                                                                |
|-------------------|----------------------------------------------------------------------------|
| `--fileName`      | The path to the `.zip` file containing the data to import.                 |
| `--environmentId` | The ID of the target environment where you want to import data.            |
| `--apiKey`        | The Management API key for the target environment.                         |
| `--include`       | (Optional) Specify entities to include in the export.                      |
| `--exclude`       | (Optional) Specify entities to exclude from the export.                    |
| `--configFile`    | (Optional) Path to a JSON configuration file containing parameters.        |

### Examples

**Importing Data into an Empty Environment**

```bash
npx @kontent-ai/data-ops@latest import \
  --fileName export.zip \
  --environmentId <target-environment-id> \
  --apiKey <Management-API-key>
```

**Importing Data Excluding Roles**

```bash
npx @kontent-ai/data-ops@latest import \
  --fileName export.zip \
  --environmentId <target-environment-id> \
  --apiKey <Management-API-key>
  --exclude roles
```

### Import Programmatically

To import data into an environment in your scripts, use the `importEnvironment` function:

```typescript
import { importEnvironment, ImportEnvironmentParams } from "@kontent-ai/data-ops";

const params: ImportEnvironmentParams = {
  environmentId: "<env-id>",
  apiKey: "<mapi-key>",
  fileName: "<filename>",
};

await importEnvironment(params);
```

---

## Known Limitations

### Entity Limitations

- **Roles and Asset Types**: Roles and [Asset Types](https://kontent.ai/learn/docs/assets/asset-organization#a-set-up-the-asset-type) are currently not exported due to API limitations. The tool also cannot set role limitations when importing workflows.

### Multiple Versions of Content

- **Published and Draft Versions**: Since the API format doesn't support language variants with both a published version and a draft version, only the [newest version](https://kontent.ai/learn/docs/workflows-publishing/create-new-versions) will be exported or imported. Published language variants that don't exist in any other workflow step are exported correctly.

### Content Scheduled for Publishing

- **Scheduled Publishing Times**: The current API format doesn't support inclusion of the publishing time for variants scheduled to be published. The tool instead places scheduled variants into the draft step (the first step in the workflow).

### Asset Size

- **Asset Size Limit**: The Management API accepts only assets smaller than 100 MB. If your export file contains assets larger than that (they can be uploaded through the UI), the tool won't be able to import them.

### Performance

- **API Rate Limitations**: The tool uses the Management API to work with project data and is thus bound by API rate limitations.
