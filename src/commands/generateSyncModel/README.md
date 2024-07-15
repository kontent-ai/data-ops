# Generate-sync-model
The `generate-sync-model` command is a part of the flow in content model synchronization (see [sync](../sync/README.md) command) between two content models. Its purpose is to generate a folder containing the content model of the provided Kontent.ai environment representing Content types, Content type snippets, and Taxonomies. The resulting folder can be used as the source content model for the `sync` command. 

The generated model follows [MAPI](https://kontent.ai/learn/docs/apis/openapi/management-api-v2/) format and is stripped of IDs and other unnecessary fields (`last_modified`). 
References to other entities (for example, a snippet within a snippet element) are updated to use `codename` instead of `id`.
Moreover, `external_id` is set for each entity. If an entity already has an externalId, its value is preserved. Otherwise, the value of the entity's `id` is used to populate the `external_id` field.
Custom properties `data-asset-codename`, `data-item-codename`, and `data-codename` are provided for the convenience of referencing items and assets inside guidelines' rich text. 
These properties are removed and transformed to the corresponding IDs or external IDs during sync.

> [!CAUTION]
> In case of manual adjustments to the folder's content, make sure to leave the content model in the correct state.

 Successful execution of the command results in four files: 
- `contentTypes.json`
- `contentTypeSnippets.json`
- `taxonomies.json`
- `metadata.json` - contains additional information - not required for sync.

### Usage

```bash
npx @kontent-ai/data-ops@latest generate-sync-model --environmentId <environment-id> --apiKey <Management-API-key>
```
