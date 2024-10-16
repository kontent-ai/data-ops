# Environment Clean Command

The `environment clean` command allows you to delete data in your Kontent.ai environment using the [Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2).

> [!WARNING]
>
> Running this command may result in **irreversible changes to your content**. Proceed with caution to avoid any unintended data loss.

> [!IMPORTANT]
>
> Before running the `environment clean` command, it's highly recommended to back up your environment's data using the [`environment backup`](/src/commands/backupRestore/README.md) command.


### Usage

```bash
npx @kontent-ai/data-ops@latest environment clean --environmentId <target-environment-id> --apiKey <Management-API-key>
```

To see all supported parameters, run:

```bash
npx @kontent-ai/data-ops@latest environment clean --help
```

> [!TIP]
>
> You can select a specific subset of entities to clean using either the `--include` or `--exclude` parameter. Note that the clean operation will fail if you attempt to delete an entity with existing dependents (e.g., a content type with existing items based on it).

### Parameters

| Parameter          | Description                                                            |
|--------------------|------------------------------------------------------------------------|
| `--environmentId`  | The ID of the target environment where the clean operation will run.   |
| `--apiKey`         | The Management API key for the target environment.                     |
| `--include`        | (Optional) Entities to include in the clean operation (e.g., `contentItems`, `assets`). |
| `--exclude`        | (Optional) Entities to exclude from the clean operation.               |
| `--configFile`     | (Optional) Path to a JSON configuration file containing parameters.    |
| `--skipWarning`    | (Optional) Skip warning messages.    |

### Examples

**Cleaning All Entities in an Environment:**

```bash
npx @kontent-ai/data-ops@latest environment clean \
  --environmentId <target-environment-id> \
  --apiKey <Management-API-key>
```

You will be prompted to confirm the operation.

**Cleaning Only Content Items and Assets:**

```bash
npx @kontent-ai/data-ops@latest environment clean \
  --environmentId <target-environment-id> \
  --apiKey <Management-API-key> \
  --include contentItems assets
```

**Excluding Taxonomies from Cleaning:**

```bash
npx @kontent-ai/data-ops@latest environment clean \
  --environmentId <target-environment-id> \
  --apiKey <Management-API-key> \
  --exclude taxonomies
```

### Using the `environment clean` Command Programmatically

You can integrate the `environment clean` operation into your scripts by using the `cleanEnvironment` function from the data-ops package. This allows for automated environment management within your applications or CI/CD pipelines.

```typescript
import { cleanEnvironment, CleanEnvironmentParams } from "@kontent-ai/data-ops";

const params: CleanEnvironmentParams = {
  environmentId: "<env-id>",
  apiKey: "<mapi-key>",
  // Optional: Specify entities to include or exclude
  // include: ['contentItems', 'assets'],
  // exclude: ['taxonomies']
};

await cleanEnvironment(params);
```