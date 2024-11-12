# Environment Backup & Restore

The `environment backup` and `enviroment restore` environment commands let you easily backup and then restore your Kontent.ai environment.

## Including and Excluding Entities in Environment commands

The `--include` and `--exclude` options allow you to specify which entities you want the command to process, giving you fine-grained control over the operation.

#### Available Entities

You can include or exclude the following entities using the `--include` and `--exclude` options:

- **`assetFolders`**: Folders used to organize assets within the asset library.
- **`assets`**: Media files such as images, videos, and documents stored in your project.
- **`collections`**: Collections in your project used to organize content items into logical groups.
- **`contentItems`**: Individual content items created in your project.
- **`contentTypeSnippets`**: Reusable groups of elements (snippets) that can be included in multiple content types.
- **`contentTypes`**: Definitions of content types that specify the structure and elements of content items.
- **`languageVariants`**: Variants of content items in different languages.
- **`languages`**: Languages configured for your project to support localization.
- **`previewUrls`**: Preview URLs set up for content types to enable content previews.
- **`roles`**: User roles that define permissions and access levels within the project (can only be exported).
- **`spaces`**: Spaces within your project define different target (preview) applications.
- **`taxonomies`**: Taxonomy groups used for categorizing and tagging content.
- **`webSpotlight`**: Web Spotlight configurations for visual website content editing.
- **`webhooks`**: Webhooks configured to notify external services of events occurring in your project.
- **`workflows`**: Workflows that outline the stages of content creation and publication.

#### Usage

- **Including Specific Entities**: Use the `--include` option followed by a list of entities you want to include in the command's operation.
- **Excluding Specific Entities**: Use the `--exclude` option followed by a list of entities you want to exclude from the command's operation.

## Environment Backup Command

With the `environment backup` command, you can backup data from your Kontent.ai environment into a single `.zip` file. The command uses the [Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2) to retrieve the environment data.

### Usage

```bash
npx @kontent-ai/data-ops@latest environment backup --environmentId=<environment-id> --apiKey=<Management-API-key>
```

To see all supported parameters, run:

```bash
npx @kontent-ai/data-ops@latest environment backup --help
```

### Parameters

| Parameter                  | Description                                                             |
| -------------------------- | ----------------------------------------------------------------------- |
| `--environmentId`          | The ID of the environment you want to backup.                           |
| `--apiKey`                 | The Management API key for the environment.                             |
| `--secureAssetDeliveryKey` | (Optional) The secure asset delivery API key for the environment.       |
| `--fileName`               | (Optional) The name of the output `.zip` file. Default is `backup.zip`. |
| `--include`                | (Optional) Specify entities to include in the backup.                   |
| `--exclude`                | (Optional) Specify entities to exclude from the backup.                 |
| `--configFile`             | (Optional) Path to a JSON configuration file containing parameters.     |

### Examples

**Backing up All Data from an Environment**

```bash
npx @kontent-ai/data-ops@latest environment backup \
  --environmentId=<environment-id> \
  --apiKey=<Management-API-key>
```

**Backing up Data Excluding Roles**

```bash
npx @kontent-ai/data-ops@latest environment backup \
  --environmentId=<environment-id> \
  --apiKey=<Management-API-key> \
  --exclude roles
```

### Backup Programmatically

To backup data from an environment in your scripts, use the `backupEnvironment` function:

```typescript
import { backupEnvironment, BackupEnvironmentParams } from "@kontent-ai/data-ops";

const params: BackupEnvironmentParams = {
  environmentId: "<env-id>",
  apiKey: "<mapi-key>",
  // Optional: specify output file name
  // fileName: "backup.zip",
  // Optional: specify secure asset delivery API key
  // secureAssetDeliveryKey: "<secure-asset-delivery-api-key>",
  // Optional: include or exclude specific entities
  // include: ["contentItems", "assets"],
  // exclude: ["roles"],
};

await backupEnvironment(params);
```

### Structure of the Backup Data

The created `.zip` package contains a `.json` file for each exported entity and a `metadata.json` file with additional information. The format of all entities is compatible with the output of the [Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2/).

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

You can check out a backup of an example environment in [the data for integration tests](https://github.com/kontent-ai/data-ops/blob/main/tests/integration/environment/backupRestore/data/backup.zip).

> [!CAUTION]
>
> Backing up roles requires the [Enterprise plan](https://kontent.ai/pricing).
>
> To avoid backing up roles, you can specify the `--exclude roles` parameter or specify only the desired entities using the `--include` parameter.

---

## Environment Restore Command

With the `environment restore` command, you can restore your Kontent.ai environment from the backup file. The command uses the [Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2) to restore the data.

> [!CAUTION]
>
> **The target environment needs to be empty**, otherwise the command might fail (e.g., in case there are entities with the same codename already present).

> [!TIP]
>
> The command requires the backup data in a `.zip` file with the same [structure](#structure-of-the-backup-data) as that produced by the [environment backup command](#environment-backup-command).
>
> To restore data from a different structure, you need to transform it into the supported format using a tool of your choice.

### Usage

```bash
npx @kontent-ai/data-ops@latest environment restore --fileName <file-to-restore> --environmentId <target-environment-id> --apiKey <Management-API-key>
```

### Parameters

| Parameter         | Description                                                         |
| ----------------- | ------------------------------------------------------------------- |
| `--fileName`      | The path to the `.zip` file containing the data to restore.         |
| `--environmentId` | The ID of the target environment where you want to restore data to. |
| `--apiKey`        | The Management API key for the target environment.                  |
| `--include`       | (Optional) Specify entities to restore.                             |
| `--exclude`       | (Optional) Specify entities to exclude from the restore.            |
| `--configFile`    | (Optional) Path to a JSON configuration file containing parameters. |

### Examples

**Restoring Data into an Empty Environment**

```bash
npx @kontent-ai/data-ops@latest environment restore \
  --fileName backup.zip \
  --environmentId <target-environment-id> \
  --apiKey <Management-API-key>
```

**Restoring Data Excluding Roles**

```bash
npx @kontent-ai/data-ops@latest environment restore \
  --fileName backup.zip \
  --environmentId <target-environment-id> \
  --apiKey <Management-API-key>
  --exclude roles
```

### Restore Programmatically

To restore data into an environment in your scripts, use the `restoreEnvironment` function:

```typescript
import { restoreEnvironment, RestoreEnvironmentParams } from "@kontent-ai/data-ops";

const params: RestoreEnvironmentParams = {
  environmentId: "<env-id>",
  apiKey: "<mapi-key>",
  fileName: "<filename>",
};

await restoreEnvironment(params);
```

---

## Known Limitations

### Entity Limitations

- **Roles and Asset Types**: Roles and [Asset Types](https://kontent.ai/learn/docs/assets/asset-organization#a-set-up-the-asset-type) are currently not a part of the backup due to API limitations. The tool also cannot set role limitations when restoring workflows.

### Multiple Versions of Content

- **Published and Draft Versions**: Due to recently removed API limitations, only the [newest version](https://kontent.ai/learn/docs/workflows-publishing/create-new-versions) will be exported or imported. Published language variants that don't exist in any other workflow step are exported correctly.

### Content Scheduled for Publishing

- **Scheduled Publishing Times**: The current API format doesn't support inclusion of the publishing time for variants scheduled to be published. The tool instead places scheduled variants into the draft step (the first step in the workflow).

### Asset Size

- **Asset Size Limit**: The Management API accepts only assets smaller than 100 MB. If your backup file contains assets larger than that (they can be uploaded through the UI), the tool won't be able to import them.

### Performance

- **API Rate Limitations**: The tool uses the Management API to work with project data and is thus bound by API rate limitations.
