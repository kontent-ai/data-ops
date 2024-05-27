# Sync
> [!CAUTION] 
> Synchronizing content model might lead to irreversible changes to the environment such as:
> - Deletion of the content by deleting the content type's elements
> - Deletion of used taxonomies.

`Sync` command synchronizes the source content model into the target environment via [Kontent.ai Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2/). The source content can be obtained from an existing Kontent.ai environment(considering you have access to the required credentials) or a folder structure in a required format (see [generate-sync-model](../generateSyncModel/README.md) command for more information). In the context of this command, the content model represents these entities: `Taxonomies`, `Content Types`, and `Content Type Snippets`. The command starts with the comparison of provided content models and creates patch operations that are printed as a diff. We `ENCOURAGE` you to examine the changes, before you proceed to the model synchronization. After the diff, a simple validation of corner cases follows, leading to an operation abortion, if an inconsistency is found. Otherwise, you will be asked to confirm the changes to begin the synchronization.

## Key points
- Sync matches entities to update between source and target by `codename`.
- If the guidelines element's rich text references content items or assets that are not present in the target environment, then after sync they are referenced using `externalId`(if externalId is non-existent `id` is used as `externalId`)
- If Linked items or Rich text element references non-existent content types, then after sync they are referenced using `externalId` (entity `codename` or a combination of multiple entities `codenames` is used as `externalId`)

## Sync conditions
To successfully synchronize the content model we introduced a few conditions your environment must follow before sync:
- There can't be an entity with the same codename but different externalId in source and target content models - checked by validation.
- There can't be an operation that changes the content type or content type snippet's element type - checked by validation.
- There can't be an operation deleting a used content type (there is at least one content item of that type) - checked by validation
- Source content model mustn't reference a deleted taxonomy group.
- If providing source content model via folder, you must ensure that the content model is in a valid state - we do not check this in validation.
- Both environments must have the same state of the Web Spotlight (either activated or deactivated).

## Usage
```bash
npx @kontent-ai/data-ops export --targetEnvironmentId=<target-environment-id> --targetApiKey=<target-management-API-key> --sourceEnvironmentId=<source-environment-id>
--sourceApiKey=<source-api-key>
```
OR

```bash
npx @kontent-ai/data-ops export --targetEnvironmentId=<target-environment-id> --targetApiKey=<target-management-API-key> --folderName=<path-to-content-folder>
```

> [!NOTE]  
> As the command might get long, we recommend passing parameters in a JSON configuration file (e.g. --configFile params.json)
> ```JSON
> // params.json example
> {
>   "targetApiKey": "<target-mapi-key>",
>   "targetEnvironmentId": "<target-env-id>",
>   "sourceEnvironmentId": "<source-env-id>",
>   "sourceApiKey": "<source-mapi-key>"
> }
> ```

To see all supported parameters, run `npx @kontent-ai/data-ops sync --help`.

## Known limitations
Using Management API introduces some limitations. Synchrozining content model won't let you:
- Change the state of Web Spotlight
- Snippet element can't be referenced in the same request when it's created. Because of this, the tool can't move it to the correct place in the content type.

## Contributing

When syncing the content model, add, patch, and delete operations must come in a specific order, otherwise, MAPI won't be able to reference some entities. Check the image below for more details.

![Content model operations order](./content_model_operations_order.png)

To successfully patch a content type, its operations for content groups and elements must also be in a specific order:
![Content type operations order](./content_type_operations_order.png)


