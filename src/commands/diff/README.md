# Diff
The `diff` command compares `content models` between two environments and prints the difference in the format of [Kontent.ai Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2/) operations. You can compare two environments by providing parameters for source and target environments (environment ID and MAPI key), or compare the target environment with a folder model created by [generate-sync-model](#generate-sync-model) command.

## Usage

```bash
npx @kontent-ai/data-ops diff --targetEnvironmentId <environment-id> --targetApiKey <Management-API-key> --sourceEnvironmentId <source-environment-id> --sourceApiKey <-Management-API-key>
```

Or

```bash
npx @kontent-ai/data-ops diff --targetEnvironmentId <environment-id> --targetApiKey <Management-API-key> --folderName <content-model-folder>
```