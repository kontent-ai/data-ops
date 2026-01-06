import type { IContentItem } from "@kontent-ai/delivery-sdk";
import { match, P } from "ts-pattern";

import { type LogOptions, logError, logInfo } from "../../../log.js";
import {
  type FetchItemsToMarkdownParams,
  fetchItemsToMarkdown,
} from "../../../modules/export/markdown/fetchItemsToMarkdown.js";
import type {
  FrontMatterOptions,
  ToMarkdownOptions,
} from "../../../modules/export/markdown/markdown.js";
import { writeMarkdowns } from "../../../modules/export/markdown/writeMarkdowns.js";
import type { RegisterCommand } from "../../../types/yargs.js";
import { simplifyErrors } from "../../../utils/error.js";

const commandName = "markdown";
const itemsFilterParams = ["items", "filter", "last", "byTypesCodenames", "collection"] as const;

export const register: RegisterCommand = (yargs) =>
  yargs.command({
    command: commandName,
    describe: "Export content items from Kontent.ai environment as markdown files.",
    builder: (yargs) =>
      yargs
        .option("environmentId", {
          type: "string",
          describe: "Id of the Kontent.ai environment.",
          demandOption: "You need to provide the environmentId.",
          alias: "e",
        })
        .option("language", {
          type: "string",
          describe: "Language codename for content items.",
          demandOption: "You need to provide the language.",
          alias: "l",
        })
        .option("output", {
          type: "string",
          describe: "Output directory for markdown files. Defaults to current directory.",
          alias: "o",
        })
        .option("items", {
          type: "array",
          string: true,
          describe: "Array of content item codenames to export.",
          alias: "i",
          conflicts: itemsFilterParams.filter((p) => p !== "items"),
        })
        .option("byTypesCodenames", {
          type: "array",
          string: true,
          describe: "Export items of specified content types.",
          conflicts: itemsFilterParams.filter((p) => p !== "byTypesCodenames"),
        })
        .option("filter", {
          type: "string",
          describe: "Custom Delivery API filter string.",
          alias: "f",
          conflicts: itemsFilterParams.filter((p) => p !== "filter"),
        })
        .option("last", {
          type: "number",
          describe: "Export the last N modified items.",
          conflicts: itemsFilterParams.filter((p) => p !== "last"),
        })
        .option("collection", {
          type: "string",
          describe: "Export items from a specific collection identified by its codename.",
          alias: "c",
          conflicts: itemsFilterParams.filter((p) => p !== "collection"),
        })
        .option("previewApiKey", {
          type: "string",
          describe: "Delivery Preview API key for accessing unpublished content.",
          alias: "pk",
        })
        .option("depth", {
          type: "number",
          describe: "Depth of linked items to fetch.",
        })
        .option("limit", {
          type: "number",
          describe: "Limit for Delivery API responses.",
        })
        .option("elements", {
          type: "array",
          string: true,
          describe: "Element codenames to include in markdown body.",
        })
        .option("noFrontmatter", {
          type: "boolean",
          describe: "Disable YAML frontmatter generation.",
          default: false,
        })
        .option("frontmatterElements", {
          type: "array",
          string: true,
          describe: "Element codenames to include in frontmatter.",
        })
        .option("frontmatterSystem", {
          type: "array",
          string: true,
          describe: "System properties to include in frontmatter (e.g., codename, name, type).",
        })
        .option("kontentUrl", {
          type: "string",
          describe: 'Custom URL for Kontent.ai endpoints. Defaults to "kontent.ai".',
        })
        .check((args) => {
          if (
            !(args.filter || args.items || args.last || args.byTypesCodenames || args.collection)
          ) {
            return "You need to provide exactly one of: 'items', 'last', 'byTypesCodenames', 'filter', or 'collection'.";
          }
          return true;
        }),
    handler: (args) => exportMarkdownCli(args).catch(simplifyErrors),
  });

export type ExportMarkdownCliParams = Readonly<{
  environmentId: string;
  language: string;
  output: string | undefined;
  items: ReadonlyArray<string> | undefined;
  byTypesCodenames: ReadonlyArray<string> | undefined;
  filter: string | undefined;
  last: number | undefined;
  collection: string | undefined;
  previewApiKey: string | undefined;
  depth: number | undefined;
  limit: number | undefined;
  elements: ReadonlyArray<string> | undefined;
  noFrontmatter: boolean;
  frontmatterElements: ReadonlyArray<string> | undefined;
  frontmatterSystem: ReadonlyArray<string> | undefined;
  kontentUrl: string | undefined;
}> &
  LogOptions;

export const exportMarkdownCli = async (params: ExportMarkdownCliParams) => {
  const resolvedParams = resolveParams(params);

  const results = await fetchItemsToMarkdown(resolvedParams);

  logInfo(params, "standard", `Writing ${results.length} markdown files...`);
  try {
    const { outputPath, itemCount } = await writeMarkdowns({
      results,
      outputPath: params.output,
      logLevel: params.logLevel,
      verbose: params.verbose,
    });
    logInfo(
      params,
      "standard",
      `Successfully exported ${itemCount} markdown files to ${outputPath}.`,
    );
  } catch (error) {
    logError(params, "standard", `Failed to write markdown files: ${error}`);
    process.exit(1);
  }
};

const resolveParams = (params: ExportMarkdownCliParams): FetchItemsToMarkdownParams => {
  const markdownOptions = buildMarkdownOptions(params);
  const baseParams = {
    environmentId: params.environmentId,
    language: params.language,
    kontentUrl: params.kontentUrl,
    logLevel: params.logLevel,
    verbose: params.verbose,
    previewApiKey: params.previewApiKey,
    markdownOptions,
    depth: params.depth,
    limit: params.limit,
  };

  return match(params)
    .with({ items: P.nonNullable }, ({ items }) => ({ ...baseParams, items }))
    .with({ byTypesCodenames: P.nonNullable }, ({ byTypesCodenames }) => ({
      ...baseParams,
      byTypesCodenames,
    }))
    .with({ filter: P.nonNullable }, ({ filter }) => ({ ...baseParams, filter }))
    .with({ last: P.nonNullable }, ({ last }) => ({ ...baseParams, last }))
    .with({ collection: P.nonNullable }, ({ collection }) => ({ ...baseParams, collection }))
    .otherwise(() => {
      logError(
        params,
        "You need to provide exactly one from parameters: --items, --filter, --byTypesCodenames, --last, or --collection",
      );
      process.exit(1);
    });
};

const buildMarkdownOptions = (
  params: ExportMarkdownCliParams,
): ToMarkdownOptions<IContentItem> | undefined => {
  const hasMarkdownOptions =
    params.elements ||
    params.noFrontmatter ||
    params.frontmatterElements ||
    params.frontmatterSystem;

  if (!hasMarkdownOptions) {
    return undefined;
  }

  const elements = params.elements
    ? Object.fromEntries(params.elements.map((e) => [e, true as const]))
    : undefined;

  const frontMatter = params.noFrontmatter
    ? (false as const)
    : params.frontmatterElements || params.frontmatterSystem
      ? ({
          system: (params.frontmatterSystem ?? []) as FrontMatterOptions<IContentItem>["system"],
          elements: (params.frontmatterElements ??
            []) as FrontMatterOptions<IContentItem>["elements"],
        } satisfies FrontMatterOptions<IContentItem>)
      : undefined;

  return {
    ...(elements && { elements }),
    ...(frontMatter !== undefined && { frontMatter }),
  };
};
