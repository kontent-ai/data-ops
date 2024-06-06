# sync-content export

The `sync-content export` command stores the **selected content items** with their assets from the **source environment** into a provided filename utilizing the [Kontent.ai migration toolkit](https://github.com/kontent-ai/kontent-ai-migration-toolkit). You can manually specify the codenames of content items from the source environment you want to synchronize, or you can utilize [Kontent.ai Delivery REST API](https://kontent.ai/learn/docs/apis/openapi/delivery-api/) to obtain the content items codenames.

> [!NOTE]
> For more information about the format of exported items check the [Kontent.ai migration toolkit](https://github.com/kontent-ai/kontent-ai-migration-toolkit) repository.

## How to utilize Delivery API to select items codenames
The command provides several parameters to cover various scenarios for selecting codenames from the source environment:
- **Obtain Specific Items**: Use the `--items:array<string>` parameter without the `--depth:number` parameter to obtain **only** the specified list of content items.
- **Obtain Items with Depth**: Use the `--items:array<string>` parameter along with the `--depth:number` parameter to first obtain items from the Delivery API with their linked items on selected depth.
- **Obtain x Last Modified Items**: Use the `--last:number` parameter to synchronize the last `x` modified content items. If you want to obtain `x > 2000` items then `x` must by divisible by 100 and limit parameter is set to 100.
- **Obtain by Content Type**: Use the `--byTypeCodename:array<string>` parameter to obtain content items filtered by the specified content types.
- **Custom Query Filtering**: Use the `--filter:string` parameter to apply a custom query string for filtering codenames. For more information, refer to the [Kontent.ai Delivery API documentation](https://kontent.ai/learn/docs/apis/openapi/delivery-api/).

> [!NOTE]
> All of the parameters above are mutually exclusive.

> [!NOTE]
> When using parameters that utilizes Delivery API, you need to provide a valid Delivery API Key that grants Preview permission using `--sourceDeliveryPreviewKey` or `--sd` parameters.

> [!CAUTION]
> All of the commands support optional `--depth` and `--limit` parameters affecting the depth of linked items selection and responze size. When specifying `--depth` parameter, we encourage you to use `--limit` appropriately to prevent hitting the upper limit for Delivery responze size. For more information, refer to the [Kontent.ai Delivery API documentation.](https://kontent.ai/learn/docs/apis/openapi/delivery-api/#section/Response-size)
  
## Usage
```bash
npx @kontent-ai/data-ops@latest sync-content export --sourceEnvironmentId=<source-environment-id>
--sourceApiKey=<source-api-key> --language=<language-codename> --items item1 item2 item3
```

As the command might get long, we recommend passing parameters in a JSON configuration file.
```JSON
{
  "sourceEnvironmentId": "<source-env-id>",
  "sourceApiKey": "<source-mapi-key>",
  "language": "<language-codename>",
}
```
Then you can use the command: 

```bash
npx @kontent-ai/data-ops@latest sync-content export --items item1 item2 item3 --configFile=params.json
```

To see all supported parameters, run `npx @kontent-ai/data-ops@latest sync-content export --help`.

## Export from external system

If you want to export content from external systems and make it importable by data-ops you can follow the instructions in [Kontent.ai migration toolkit](https://github.com/kontent-ai/kontent-ai-migration-toolkit/blob/main/samples/migrate-from-external-system.ts). This repository also provides you with [a sample script](https://github.com/kontent-ai/kontent-ai-migration-toolkit/blob/main/samples/migrate-from-external-system.ts).