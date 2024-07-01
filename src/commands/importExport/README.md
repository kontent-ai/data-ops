# Export & Import

## Export

With the `export` command, you can export data from your Kontent.ai environment into a single `.zip` file.
The command uses [the Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2) to get the environment data.

### Usage

```bash
npx @kontent-ai/data-ops@latest export --environmentId=<environment-id-to-export> --apiKey=<Management-API-key>
```
To see all supported parameters, run `npx @kontent-ai/data-ops@latest export --help`.

### Structure of the Exported Data

The exported `.zip` package contains a `.json` file for each exported entity and a `metadata.json` file with additional information.
Format of all the entities is compatible with the output of the [Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2/).

> [!TIP]
> If you need the data in a different format, you can process the `.zip` data with a variety of other tools to transform it as per your requirements.

```
- output.zip
|- assetFolders.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Asset-folders
|- assets
 |- All the asset files named <assetId>-<fileName>
|- assets.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Assets
|- contentItems.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Content-items
|- contentTypeSnippets.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Content-type-snippets
|- languageVariants.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Language-variants
|- languages.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/languages
|- metadata.json # version, timestamp, environmentId
|- previewUrls.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Preview-URLs
|- roles.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Roles
|- workflows.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Workflows
```
You can check out exported data of an example project in [the data for integration tests](https://github.com/kontent-ai/data-ops/blob/main/tests/integration/importExport/data/exportSnapshot.zip).

> [!CAUTION]
> Exporting roles requires the [Enterprise plan](https://kontent.ai/pricing).
>
> If you don't want to export roles, you can specify them in the `--exclude` parameter or select only the other entities in the `--include` parameter
> (e.g. `npx @kontent-ai/data-ops@latest export ... --exclude roles`).
>
> To get more information about the parameters or what other parameters are available, run `npx @kontent-ai/data-ops@latest export --help`.


## Import

With the `import` command, you can import data into your Kontent.ai environment.
The command uses [the Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2) to import the data.

> [!CAUTION]
> **The target environment needs to be empty**, otherwise the command might fail (e.g. when there are entities with the same codename already present).

> [!TIP]
> The command expects the data for import in a `.zip` file in the same [structure](#structure-of-the-exported-data) that is produced by the [export command](#export).
>
> If you want to import data from a different structure, you can use any available tool to convert it into the supported format.

### Usage

```bash
npx @kontent-ai/data-ops@latest import --fileName <file-to-import> --environmentId <target-environment-id> --apiKey <Management-API-key>
```
To see all supported parameters, run `npx @kontent-ai/data-ops@latest import --help`.

## Known Limitations
### Entity limitations

Roles and [asset type](https://kontent.ai/learn/docs/assets/asset-organization#a-set-up-the-asset-type) entities are currently not being exported due to API limitations.
The tool also can't set role limitations when importing workflows.

### Multiple Versions of content
Since the API format doesn't support language variants with both a published version and a draft version, only the [newest version](https://kontent.ai/learn/docs/workflows-publishing/create-new-versions) will be exported or imported.
Published language variants that don't exist in any other workflow step are exported correctly.

### Content Scheduled For Publishing
As the current API format doesn't support inclusion of the publishing time for variants scheduled to be published, the tool instead puts the scheduled variants into the draft step (the first step in the workflow).

### Web Spotlight
[Web Spotlight](https://kontent.ai/learn/develop/hello-web-spotlight) currently can't be enabled through the tool. As a result, it is not possible to set root item for spaces as this can only be done on environments with Web Spotlight enabled.

### Asset Size
The management API accepts only assets smaller than 100MB.
If your export file contains assets bigger than that (they can be uploaded through the UI), the tool won't be able to import them.

### Performance
The tool leverages the Management API to work with the project data and thus is bound by the API rate limitations.
