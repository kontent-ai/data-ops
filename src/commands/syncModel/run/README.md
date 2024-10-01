# sync-model run

> [!CAUTION] 
> Synchronizing content model might lead to irreversible changes to the environment such as:
> - Deletion of content by deleting elements from a content type
> - Deletion of used taxonomies
> - Removing roles limitations in workflows (see [known limitations](#known-limitations))

The `sync-model run` command synchronizes the **source content model** into the **target environment** via [Kontent.ai Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2/). The source content can be obtained from an existing Kontent.ai environment (considering you have access to the required credentials) or a folder structure in a required format (see [sync-model export](../export/README.md) command for more information). Using the CLI command you can filter data by entity type with the mandatory `--entities` parameter. For more advanced filtering, you can use the `entities` parameter through [programmatic sync](#sync-model-programmatically), where you can define custom filter predicate functions for each entity. These functions are optional and, if not provided, the entity WON'T be synced by default.

> [!CAUTION]
> Partial sync requires that all dependent entities are either already present in the environment or included in the sync process. Otherwise, the partial sync may fail, leaving your environment in an incomplete state.

In the context of this command, the content model is represented by the following entities: `Taxonomies`, `Content Types`, `Content Type Snippets`, `Web Spotlight`, `Asset Folders`, `Collections`, `Spaces`, `Languages` and `Workflows`. The command begins by comparing the provided content models and generates patch operations, which are then printed as the **environment diff**.  

**We strongly encourage you to examine the changes before you proceed with the model synchronization.** Following the diff, a validation is performed to ensure the sync operation can succeed. Should the validation find any inconsistencies, the operation may be terminated. Otherwise, you will be asked for confirmation to begin the synchronization.

## Key principles
- Sync matches entities between the source and the target models via a `codename`.
- The command does not sync `external_id` properties of content model entities (existing `external_id` cannot be changed and can conflict with other entities). 
- If the model contains `guidelines` that reference content items or assets that are not present in the target environment, they will be referenced by their `external_id`(if externalId is non-existent `id` is used as `external_id`) after the synchronization. Remember to migrate any missing content to the target environment either beforehand (preferably) or afterward to achieve the desired results.
- If `Linked items` or `Rich text element` references non-existent content types, they will be referenced using the `external_id` after the synchronization (one or more entity `codenames` are used to form the `external_id`).
  
## Sync model conditions
To successfully synchronize the content model, we introduced a couple of conditions your environment **must follow** before attempting the sync:
- There mustn't be an operation that changes the content type or content type snippet's element type - checked by validation.
- There mustn't be an operation deleting a used content type (there is at least one content item of that type) - checked by validation.
- There mustn't be an operation deleting a used collection (there is at least one content item in that collection) - checked by validation.
- The source content model mustn't reference a deleted taxonomy group - not checked by validation!
- If providing source content model via a folder, you must ensure that the content model is in a valid state 
  - Files are partially checked to see whether they meet the MAPI structure using `zod` validation. Not all conditions are checked! (e.g. whether the used codename exists)

## Known limitations
Using Management API introduces some limitations:
- Snippet element can't be referenced in the same request it's created in. Because of this, the tool can't move it to the correct place in the content type.
- Asset folders cannot be moved so if they are in a different location in the source environment, they are removed and created in the new place.
- Asset folders cannot be deleted (or moved, see the previous point) if they contain assets. The command is not able to check this without loading all the assets in the project so it doesn't check it. Please, make sure that all folders that will be deleted does not contain any assets. You can see what folders will be deleted in the generated diff `sync-model diff ...`.
- Languages cannot be deleted, instead, they are deactivated. Their name and codename are replaced with the first 8 characters of a randomly generated UUID (name and codename have a limit of 25 characters).
- Roles cannot be added or patched via MAPI and are therefore not synced.
  - Consequently, **all role restrictions for workflow steps are lost** when adding a new workflow or adjusting an existing one during sync.

## Usage
```bash
npx @kontent-ai/data-ops@latest sync-model run --targetEnvironmentId=<target-environment-id> --targetApiKey=<target-management-API-key> --sourceEnvironmentId=<source-environment-id> --entities contentTypes contentTypeSnippets taxonomies
--sourceApiKey=<source-api-key>
```
OR

```bash
npx @kontent-ai/data-ops@latest sync-model run --targetEnvironmentId=<target-environment-id> --targetApiKey=<target-management-API-key> --folderName=<path-to-content-folder> --entities contentTypes contentTypeSnippets taxonomies 
```

> [!NOTE]  
> As the command might get long, we recommend passing parameters in a JSON configuration file (e.g. --configFile params.json)
> ```JSON
> {
>   "sourceEnvironmentId": "<source-env-id>",
>   "sourceApiKey": "<source-mapi-key>",
>   "targetEnvironmentId": "<target-env-id>",
>   "targetApiKey": "<target-mapi-key>",
>    "entities": ["contentTypes", "contentTypeSnippets", "taxonomies", "collections", "assetFolders", "spaces", "languages", "webSpotlight", "workflows"]
> }
> ```

To see all supported parameters, run `npx @kontent-ai/data-ops@latest sync-model run --help`.

### Sync model programmatically

To sync model in environments in your scripts, use `syncModelRun` function:

```ts
import { syncModelRun, SyncModelRunParams } from "@kontent-ai/data-ops";

const params: SyncModelRunParams = {
  sourceEnvironmentId: "<source-env-id>",
  sourceApiKey: "<source-mapi-key>",
  targetEnvironmentId: "<target-env-id>",
  targetApiKey: "<target-mapi-key>",
  entities: {
    contentTypes: () => true, // will sync
    taxonomies: () => false, // won't sync
    languages: (lang) => lang.codename === "default" // will sync only codename with default codename
  }
};

await syncModelRun(params);
```

## Contributing

To successfully patch a content type, its operations for content groups and elements must be in a specific order:
![Content type operations order](./images/content_type_operations_order.png)

### Taxonomy diff handler

Taxonomies are handled as a flat array of terms with each term having an additional property `position` that encodes its position in the tree.
The `position` property is an array of term codenames starting from the term's parent up to the root term (a taxonomy group child).

Since the terms are flattened in pre-order (parent is before its children), moving a term into an added term is not an issue, as the parent term will be processed before the moved term (added first). 

Similarly, remove operations in the array handler are added at the end, so moving a term from a removed term is also not a problem.
