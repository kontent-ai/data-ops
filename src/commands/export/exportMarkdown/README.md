# Export Markdown Command

The `export markdown` command exports content items from a Kontent.ai environment as markdown files with [YAML frontmatter](https://mdxjs.com/guides/frontmatter/). Frontmatter is structured metadata at the beginning of markdown files, commonly used by static site generators (Jekyll, Hugo, Astro, Docusaurus) and beneficial for AI/RAG systems where markdown improves retrieval quality and provides context for LLM generation.

The command uses the [Delivery API](https://kontent.ai/learn/docs/apis/openapi/delivery-api/) to fetch content items and converts them to markdown format.

## Usage

```bash
npx @kontent-ai/data-ops@latest export markdown \
  --environmentId <environment-id> \
  --language <language-codename> \
  --items <item-codename>
```

To see all supported parameters, run:

```bash
npx @kontent-ai/data-ops@latest export markdown --help
```

### Using a Configuration File

Create a `config.json` file:

```json
{
  "environmentId": "<environment-id>",
  "language": "en-US",
  "items": ["article_1", "article_2"],
  "output": "./markdown-export"
}
```

Run the command:

```bash
npx @kontent-ai/data-ops@latest export markdown --configFile config.json
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `--environmentId`, `-e` | The ID of the Kontent.ai environment. |
| `--language`, `-l` | Language codename for content items. |
| `--output`, `-o` | (Optional) Output directory for markdown files. Defaults to current directory. |
| `--items`, `-i` | (Optional) Content item codenames to export. |
| `--byTypesCodenames` | (Optional) Export items of specified content types. |
| `--filter`, `-f` | (Optional) Custom Delivery API filter string. |
| `--last` | (Optional) Export the last N modified items. |
| `--collection`, `-c` | (Optional) Export items from a specific collection. |
| `--previewApiKey`, `-pk` | (Optional) Delivery Preview API key for unpublished content. |
| `--depth` | (Optional) Depth of linked items to fetch. |
| `--limit` | (Optional) Limit for Delivery API responses. |
| `--elements` | (Optional) Element codenames to include in markdown body. |
| `--noFrontmatter` | (Optional) Disable YAML frontmatter generation. |
| `--frontmatterElements` | (Optional) Element codenames to include in frontmatter. |
| `--frontmatterSystem` | (Optional) System properties to include in frontmatter (e.g., codename, name, type). |
| `--kontentUrl` | (Optional) Custom URL for Kontent.ai endpoints. |
| `--configFile` | (Optional) Path to a JSON configuration file containing parameters. |

> [!NOTE]
> Filter parameters are mutually exclusive. You must provide exactly one of: `--items`, `--byTypesCodenames`, `--filter`, `--last`, or `--collection`.

### Examples

**Exporting Specific Items**

```bash
npx @kontent-ai/data-ops@latest export markdown \
  --environmentId <environment-id> \
  --language en-US \
  --items article_1 article_2
```

**Exporting by Content Type**

```bash
npx @kontent-ai/data-ops@latest export markdown \
  --environmentId <environment-id> \
  --language en-US \
  --byTypesCodenames article blog_post
```

**Selecting Specific Elements**

```bash
npx @kontent-ai/data-ops@latest export markdown \
  --environmentId <environment-id> \
  --language en-US \
  --byTypesCodenames article \
  --elements title summary body
```

**Exporting with Custom Frontmatter**

```bash
npx @kontent-ai/data-ops@latest export markdown \
  --environmentId <environment-id> \
  --language en-US \
  --items my_article \
  --frontmatterSystem codename name type \
  --frontmatterElements title category
```

**Exporting Without Frontmatter**

```bash
npx @kontent-ai/data-ops@latest export markdown \
  --environmentId <environment-id> \
  --language en-US \
  --last 10 \
  --noFrontmatter
```

**Exporting Unpublished Content**

```bash
npx @kontent-ai/data-ops@latest export markdown \
  --environmentId <environment-id> \
  --language en-US \
  --byTypesCodenames article \
  --previewApiKey <preview-api-key>
```

## Exporting Markdown Programmatically

The programmatic API returns markdown strings **in memory** rather than writing files. This gives you full control to process, transform, or save the markdown however you need. The programmatic API also offers more customization options, including custom element resolvers for precise control over how each element type is rendered.

### Using `fetchItemsToMarkdown`

The `fetchItemsToMarkdown` function fetches content items from your environment and returns them as markdown strings:

```typescript
import { fetchItemsToMarkdown, FetchItemsToMarkdownParams } from "@kontent-ai/data-ops";

const params: FetchItemsToMarkdownParams = {
  environmentId: "<env-id>",
  language: "en-US",
  items: ["article_1", "article_2"],
  markdownOptions: {
    frontMatter: {
      system: ["codename", "name", "type"],
      elements: ["title"],
    },
  },
};

const results = await fetchItemsToMarkdown(params);
// results: ReadonlyArray<{ codename: string, markdown: string }>

// Process results as needed - write to files, transform, or use directly
results.forEach(({ codename, markdown }) => {
  fs.writeFileSync(`./output/${codename}.md`, markdown);
});
```

### Using `toMarkdown` Directly

The `toMarkdown` function converts a single content item to markdown. Use this when you already have content items from the Delivery SDK:

```typescript
import { toMarkdown } from "@kontent-ai/data-ops";

const markdown = toMarkdown(contentItem, {
  elements: {
    title: true,
    body: true,
    author: true,
  },
  frontMatter: {
    system: ["codename", "name"],
    elements: ["category"],
  },
});
```

> [!NOTE]
> The order of keys in `options.elements` determines the order of elements in the resulting markdown body. Elements are rendered in the exact order you specify them.

### Default Element Resolvers

When no custom resolver is provided, each element type is rendered using these defaults:

| Element Type | Default Output |
|--------------|----------------|
| Text | Raw value |
| Number | `**Name**: value` |
| DateTime | `**Name**: value` |
| UrlSlug | `**Name**: value` |
| Assets | `**Name**:\n\n![asset_name](url)` |
| Taxonomy | `**Name**: term1, term2, ...` |
| MultipleChoice | `**Name**: choice1, choice2, ...` |
| LinkedItems (ModularContent) | `**Name**: item1, item2, ...` |
| RichText | Converted via `@kontent-ai/rich-text-resolver-markdown` |
| Custom | Raw value |

> [!NOTE]
> Elements that don't exist on the content item are automatically omitted. For Text, Custom, and RichText elements, empty or null values are also omitted. Other element types (Number, DateTime, UrlSlug, Taxonomy, MultipleChoice, LinkedItems, Assets) render the element name even when empty (e.g., `**Name**: `). Use a custom resolver if you need different handling for empty values.

### Custom Element Resolvers

You can customize how specific element types are rendered. Custom resolvers are **additive** - providing a resolver for one element type does not affect other types, which continue using their default resolvers.

```typescript
import { toMarkdown } from "@kontent-ai/data-ops";

const markdown = toMarkdown(contentItem, {
  resolvers: {
    modular_content: (element) =>
      element.linkedItems.map((item) => `> ${item.system.name}`).join("\n\n"),
  },
});
```

### Custom Linked Items Resolver

For linked items (ModularContent), you might want to render the full content of referenced items:

```typescript
import { toMarkdown } from "@kontent-ai/data-ops";

const markdown = toMarkdown(contentItem, {
  resolvers: {
    modular_content: (element) =>
      element.linkedItems
        .map((item) => `### ${item.system.name}\n\n${toMarkdown(item)}`)
        .join("\n\n"),
  },
});
```

### Custom Rich Text Resolver

For rich text elements, you can use [@kontent-ai/rich-text-resolver](https://github.com/kontent-ai/rich-text-resolver-js) directly with custom `PortableTextMarkdownResolvers` for precise control:

```typescript
import { toMarkdown } from "@kontent-ai/data-ops";
import { transformToPortableText } from "@kontent-ai/rich-text-resolver";
import { toMarkdown as portableTextToMarkdown } from "@kontent-ai/rich-text-resolver-markdown";

const markdown = toMarkdown(contentItem, {
  resolvers: {
    rich_text: (element) => {
      const portableText = transformToPortableText(element.value);
      return portableTextToMarkdown(portableText, {
        components: {
          types: {
            componentOrItem: ({ value }) => `[Component: ${value.componentOrItem._ref}]`,
          },
        },
      });
    },
  },
});
```

### Per-Element Custom Functions

While `resolvers` customize rendering for all elements of a given type, you can use `elements` to customize rendering for a **specific element by codename**. This is useful when you want different rendering for elements of the same type.

Only elements specified in `options.elements` are included in the output. Use `true` to render an element with its default resolver, or provide a custom function to override the rendering for that specific element:

```typescript
import { toMarkdown } from "@kontent-ai/data-ops";

const markdown = toMarkdown(contentItem, {
  elements: {
    title: (element) => `# ${element.value}`,
    summary: true,
    body: true,
  },
});
```

> [!TIP]
> The `toMarkdown` function is generic and accepts `IContentItem`. For full type safety, generate your content types using [@kontent-ai/model-generator](https://www.npmjs.com/package/@kontent-ai/model-generator). This gives you autocomplete and type checking for element codenames and values:
>
> ```typescript
> import { toMarkdown } from "@kontent-ai/data-ops";
> import { Article } from "./models";
>
> const markdown = toMarkdown<Article>(article, {
>   elements: {
>     title: (element) => `# ${element.value}`,
>     summary: true,
>   },
> });
> ```

### Advanced Filtering

When using `fetchItemsToMarkdown`, you can filter content items in several ways:

```typescript
// By specific item codenames
const params = { environmentId, language, items: ["item_1", "item_2"] };

// By content types
const params = { environmentId, language, byTypesCodenames: ["article", "blog_post"] };

// By collection
const params = { environmentId, language, collection: "blog" };

// Most recently modified
const params = { environmentId, language, last: 50 };

// Custom Delivery API filter
const params = { environmentId, language, filter: "elements.category[contains]=news" };
```
