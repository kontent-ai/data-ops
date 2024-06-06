# sync-content run
> [!CAUTION] 
> Synchronizing content might lead to irreversible changes to your environment!

The `sync-content` command synchronizes the **selected content items** into the **target environment** via [Kontent.ai Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2/) utilizing the [Kontent.ai migration toolkit](https://github.com/kontent-ai/kontent-ai-migration-toolkit). You can manually specify the codenames of content items from the source environment you want to synchronize, or you can utilize [Kontent.ai Delivery REST API](https://kontent.ai/learn/docs/apis/openapi/delivery-api/) to obtain the content items codenames. Before the synchronization, the command prints the codenames of the affected content items. We `ENCOURAGE` you to examine the affected content items selection before you proceed with the content synchronization.

## How to utilize Delivery API to select items codenames
The command provides several parameters to cover various scenarios for selecting codenames from the source environment:
- **Synchronize Specific Items**: Use the `--items:array<string>` parameter without the `--depth:number` parameter to synchronize **only** the specified list of content items.
- **Synchronize Items with Depth**: Use the `--items:array<string>` parameter along with the `--depth:number` parameter to first obtain items from the Delivery API with their linked items on selected depth.
- **Synchronize x Last Modified Items**: Use the `--last:number` parameter to synchronize the last `x` modified content items. If you want to synchronize `x > 2000` items then `x` must by divisible by 100 and limit parameter is set to 100.
- **Synchronize by Content Type**: Use the `--byTypeCodename:array<string>` parameter to synchronize content items filtered by the specified content types.
- **Custom Query Filtering**: Use the `--filter:string` parameter to apply a custom query string for filtering codenames. For more information, refer to the [Kontent.ai Delivery API documentation](https://kontent.ai/learn/docs/apis/openapi/delivery-api/).

> [!NOTE]
> All of the parameters above are mutually exclusive.

> [!NOTE]
> When using parameters that utilizes Delivery API, you need to provide a valid Delivery API Key that grants Preview permission using `--sourceDeliveryPreviewKey` or `--sd` parameters.

> [!CAUTION]
> All of the commands support optional `--depth` and `--limit` parameters affecting the depth of linked items selection and responze size. When specifying `--depth` parameter, we encourage you to use `--limit` appropriately to prevent hitting the upper limit for Delivery responze size. For more information, refer to the [Kontent.ai Delivery API documentation.](https://kontent.ai/learn/docs/apis/openapi/delivery-api/#section/Response-size)
  
## Usage
```bash
npx @kontent-ai/data-ops sync-content run --targetEnvironmentId=<target-environment-id> --targetApiKey=<target-management-API-key> --sourceEnvironmentId=<source-environment-id>
--sourceApiKey=<source-api-key> --language=<language-codename> --items item1 item2 item3
```

As the command might get long, we recommend passing parameters in a JSON configuration file.
```JSON
{
  "targetApiKey": "<target-mapi-key>",
  "targetEnvironmentId": "<target-env-id>",
  "sourceEnvironmentId": "<source-env-id>",
  "sourceApiKey": "<source-mapi-key>",
  "language": "<language-codename>",
}
```
Then you can use the command: 

```bash
npx @kontent-ai/data-ops sync-content run --items item1 item2 item3 --configFile=params.json
```

To see all supported parameters, run `npx @kontent-ai/data-ops@latest sync-content run --help`.
