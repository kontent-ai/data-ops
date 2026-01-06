import { type Elements, ElementType, type IContentItem } from "@kontent-ai/delivery-sdk";
import { transformToPortableText } from "@kontent-ai/rich-text-resolver";
import {
  type PortableTextMarkdownResolvers,
  toMarkdown as portableTextToMarkdown,
} from "@kontent-ai/rich-text-resolver-markdown";
import yaml from "js-yaml";
import { match } from "ts-pattern";
import { notNull, notNullOrUndefined } from "../../../utils/typeguards.js";

type DeliveryElement =
  | Elements.TextElement
  | Elements.NumberElement
  | Elements.LinkedItemsElement
  | Elements.AssetsElement
  | Elements.DateTimeElement
  | Elements.TaxonomyElement
  | Elements.MultipleChoiceElement
  | Elements.RichTextElement
  | Elements.UrlSlugElement
  | Elements.CustomElement
  | Elements.UnknownElement;

type ElementTypeToElement = {
  [ElementType.Text]: Elements.TextElement;
  [ElementType.Number]: Elements.NumberElement;
  [ElementType.ModularContent]: Elements.LinkedItemsElement;
  [ElementType.Asset]: Elements.AssetsElement;
  [ElementType.DateTime]: Elements.DateTimeElement;
  [ElementType.Taxonomy]: Elements.TaxonomyElement;
  [ElementType.MultipleChoice]: Elements.MultipleChoiceElement;
  [ElementType.RichText]: Elements.RichTextElement;
  [ElementType.UrlSlug]: Elements.UrlSlugElement;
  [ElementType.Custom]: Elements.CustomElement;
  [ElementType.Unknown]: Elements.UnknownElement;
};

type ElementResolvers<T extends IContentItem> = {
  [K in ElementType]: (
    element: ElementTypeToElement[K],
    toMarkdownOptions?: ToMarkdownOptions<T>,
  ) => string;
};

const portableTextMarkdownDefaultResolvers: PortableTextMarkdownResolvers = {
  components: {
    types: {
      componentOrItem: ({ value }) => {
        return `**Component or Item**: ${value.componentOrItem._ref}\n\n`;
      },
    },
  },
};

const defaultElementMarkdownResolvers = {
  [ElementType.Text]: (element) => element.value,
  [ElementType.Number]: (element) => `**${element.name}**: ${element.value?.toString() ?? ""}`,
  [ElementType.ModularContent]: (element) =>
    `**${element.name}**: ${element.linkedItems.map((i) => i.system.name).join(", ")}`,
  [ElementType.Asset]: (element) =>
    `**${element.name}**:\n\n${element.value.map((a) => `![${a.name}](${a.url})`).join("\n")}`,
  [ElementType.DateTime]: (element) => `**${element.name}**: ${element.value ?? ""}`,
  [ElementType.Taxonomy]: (element) =>
    `**${element.name}**: ${element.value.map((t) => t.name).join(", ")}`,
  [ElementType.MultipleChoice]: (element) =>
    `**${element.name}**: ${element.value.map((c) => c.name).join(", ")}`,
  [ElementType.RichText]: (element) => {
    const portableText = transformToPortableText(element.value);
    return portableTextToMarkdown(portableText, portableTextMarkdownDefaultResolvers);
  },
  [ElementType.UrlSlug]: (element) => `**${element.name}**: ${element.value}`,
  [ElementType.Custom]: (element) => element.value,
  [ElementType.Unknown]: (element) => String(element.value),
} as const satisfies ElementResolvers<IContentItem>;

export type ElementsOptions<T extends IContentItem> = Partial<{
  [K in keyof T["elements"]]: true | ((element: T["elements"][K]) => string);
}>;

export type FrontMatterOptions<T extends IContentItem> = {
  system: ReadonlyArray<Exclude<keyof T["system"], "sitemapLocations">>;
  elements: ReadonlyArray<keyof T["elements"]>;
};

export type ToMarkdownOptions<T extends IContentItem> = {
  elements?: ElementsOptions<T>;
  frontMatter?: false | FrontMatterOptions<T>;
  resolvers?: Partial<ElementResolvers<T>>;
};

/**
 * Converts a Kontent.ai content item to markdown with YAML front matter.
 *
 * The order of keys in `options.elements` determines the order of elements in the resulting markdown body.
 * When `options.elements` is not provided, all elements from the content item are included in their original order.
 *
 * Front matter includes system properties and optionally element values. When `options.frontMatter` is not provided,
 * all system properties are included by default with no elements. Set `options.frontMatter` to `false` to omit it entirely,
 * or provide a `FrontMatterOptions` object to specify which system properties and element values to include.
 *
 * Element resolution can be customized in two ways:
 * - `options.elements[codename]` - set to `true` to use type-based resolver, or provide a function to override resolution for that specific element
 * - `options.resolvers[type]` - override the default resolver for all elements of a given type (used when element is set to `true`). When not provided, our opinionated default resolvers are used.
 *
 * For rich-text element resolution, consider using @kontent-ai/rich-text-resolver directly with custom
 * PortableTextMarkdownResolvers for more precise control over the output.
 */
export const toMarkdown = <T extends IContentItem>(
  item: T,
  options?: ToMarkdownOptions<T>,
): string => {
  const header = toFrontmatter(item, options?.frontMatter);
  const body = toMarkdownBody(item, options);

  return [header, body].filter(notNullOrUndefined).join("\n\n");
};

const getElementFrontmatterValue = (element: DeliveryElement): unknown =>
  match(element)
    .when(
      (v): v is Elements.LinkedItemsElement => v.type === ElementType.ModularContent,
      (el) => el.linkedItems.map((i) => i.system.name),
    )
    .when(
      (v): v is Elements.AssetsElement => v.type === ElementType.Asset,
      (el) => el.value.map((a) => a.url),
    )
    .when(
      (v): v is Elements.TaxonomyElement => v.type === ElementType.Taxonomy,
      (el) => el.value.map((t) => t.name),
    )
    .when(
      (v): v is Elements.MultipleChoiceElement => v.type === ElementType.MultipleChoice,
      (el) => el.value.map((c) => c.name),
    )
    .otherwise((el) => el.value ?? "");

export const toFrontmatter = <T extends IContentItem>(
  item: T,
  frontMatter?: false | FrontMatterOptions<T>,
): string | null => {
  if (frontMatter === false) {
    return null;
  }

  const selected = frontMatter ?? {
    system: (Object.keys(item.system) as ReadonlyArray<keyof T["system"]>).filter(
      (key) => key !== "sitemapLocations",
    ),
    elements: [],
  };

  const systemData = Object.fromEntries(
    selected.system.map((key) => [key, item.system[key as keyof typeof item.system]] as const),
  );

  const elementData = Object.fromEntries(
    selected.elements
      .map((key) => {
        const element = item.elements[key as keyof typeof item.elements];
        if (!element) {
          return null;
        }
        return [key, getElementFrontmatterValue(element)] as const;
      })
      .filter(notNull),
  );

  const yamlStr = yaml.dump(
    { ...systemData, ...elementData },
    {
      lineWidth: -1,
      flowLevel: 1,
    },
  );

  return `---\n${yamlStr}---`;
};

const toMarkdownBody = <T extends IContentItem>(
  item: T,
  options?: ToMarkdownOptions<T>,
): string => {
  const selectedElements = Object.entries(
    options?.elements ?? Object.fromEntries(Object.keys(item.elements).map((k) => [k, true])),
  );
  const resolvers = { ...defaultElementMarkdownResolvers, ...(options?.resolvers ?? {}) };

  return selectedElements
    .map(([elementCodename, resolver]) => {
      const el = item.elements[elementCodename];

      if (!el) {
        return "";
      }

      if (resolver === true) {
        const r = resolvers[el.type] as ((element: typeof el) => string) | undefined;
        return r ? r(el) : "";
      }

      return (resolver as (element: typeof el) => string)(el);
    })
    .filter(Boolean)
    .join("\n\n");
};
