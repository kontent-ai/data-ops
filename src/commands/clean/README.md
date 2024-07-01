## Clean

The `clean` command allows you to delete data in your Kontent.ai environment using [the Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2).

> [!WARNING]
> Running this command may result in **irreversible changes to your content**. Proceed with caution to avoid any unintended data loss.

> [!TIP]
> You can select specific subset of entities to clean using either `include` or `exclude` parameter. Note that the clean operation will fail if you attempt to delete an entity with existing dependants (e.g. a content type with existing items based on it).

## Known Limitations

### Web Spotlight
[Web Spotlight](https://kontent.ai/learn/develop/hello-web-spotlight) currently can't be enabled/disabled through the tool. As a result the `clean` operation cannot delete the root type associated with Web Spotlight as long as it's enabled and therefore skips it.

### Usage

```bash
npx @kontent-ai/data-ops@latest clean --environmentId <target-environment-id> --apiKey <Management-API-key>
```
To see all supported parameters, run `npx @kontent-ai/data-ops@latest clean --help`.
