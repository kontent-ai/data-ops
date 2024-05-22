# Sync
> [!CAUTION] 
> Synchronizing content model might lead to irreversible changes to the environment such as:
> - Deletion of the content by deleting content type's elements
> - Deletion of used taxonomies.

`Sync` command synchronizes source content model into target environment via [Kontent.ai Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2/) . The source content can be obtained from an existing Kontent.ai environment(considering you have access to the required credentials) or a folder structure in a required format (see [generate-sync-model](../generateSyncModel/README.md) command for more information). In the context of this command, content model represents these entities: `Taxonomies`, `Content Types` and `Content Type Snippets`. The command starts with the comparison of provided content models and creates patch operations that are printed as a diff. We `ENCOURAGE` you to examine the changes, before you proceed to the model synchronization. After the diff, a simple validation of corner cases follows, leading to an operation abortion, if an inconsistency is found. Otherwise you will be asked to confirm the changes to begin the synchronization.

## Key points
- Sync matches entities to update between source and target by `codename`.
- If guidelines element's rich text references content items or assets that are not present in target environment, then after sync they are referenced using `externalId`(if externalId is non-existent `id` is used as `externalId`)
- If Linked items or Rich text element references non-existent content types, then after sync they are referenced using `externalId` (entity `codename` or a combination of multiple entities `codenames` is used as `externalId`)

## Sync conditions
To sucessfully synchronize content model we introduced few conditions your environment must follow before sync:
- There can't be entity with the same codename but different externalId in source and target content models - checked by validation.
- There can't be an operation that changes content type's or content type snippet's element type - checked by validation.
- There can't be an operation deleting a used content type (there is atleast one content item of that type) - checked by validation
- Source content model mustn't reference a deleted taxonomy group.
- If providing source content model via folder, you must ensure that the content model is in valid state - we do not check this in validation.
- Both environments must have same state of the Web Spotlight (either activated or deactivated).

## Usage
```bash
npx @kontent-ai/data-ops export --targetEnvironmentId=<target-environment-id> --targetApiKey=<target-management-API-key> --sourceEnvironmentId=<source-environment-id>
--sourceApiKey=<source-api-key>
```
OR

```bash
npx @kontent-ai/data-ops export --targetEnvironmentId=<target-environment-id> --targetApiKey=<target-management-API-key> --folderName=<path-to-content-folder>
```
To see all supported parameters, run `npx @kontent-ai/data-ops sync --help`.

## Known limitations
Using Management API introduces some limitations. Synchrozining content model won't let you:
- Change state of Web Spotlight
- Snippet element can't be referenced in same request when it is created. Because of this, the tool can't move it to the correct place in the content type.
