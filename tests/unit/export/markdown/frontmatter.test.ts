import { type Elements, ElementType, type IContentItem } from "@kontent-ai/delivery-sdk";
import { describe, expect, it } from "vitest";

import { toFrontmatter } from "../../../../src/modules/export/markdown/markdown.ts";

type FrontmatterTestItem = IContentItem<
  {
    readonly category: Elements.TaxonomyElement;
    readonly options: Elements.MultipleChoiceElement;
    readonly related: Elements.LinkedItemsElement;
    readonly images: Elements.AssetsElement;
    readonly count: Elements.NumberElement;
    readonly keyword: Elements.TextElement;
    readonly description: Elements.TextElement;
  },
  string,
  string,
  string,
  string,
  string
>;

const frontmatterTestItem = {
  system: {
    id: "test-id",
    name: "Guide: Part One",
    codename: "issue_123",
    language: "default",
    type: "test_type",
    collection: "default",
    lastModified: "2024-01-01T00:00:00Z",
    workflow: "true",
    workflowStep: 'Say "Hello"',
    sitemapLocations: [],
  },
  elements: {
    category: {
      type: ElementType.Taxonomy,
      name: "Category",
      taxonomyGroup: "categories",
      value: [{ name: "Type: Article", codename: "type_article" }],
    },
    options: {
      type: ElementType.MultipleChoice,
      name: "Options",
      value: [
        { name: "Option #1", codename: "option_1" },
        { name: "Option: Two", codename: "option_2" },
      ],
    },
    related: {
      type: ElementType.ModularContent,
      name: "Related",
      value: ["item_1"],
      linkedItems: [
        {
          system: {
            id: "linked-id",
            name: "Article: The Guide",
            codename: "item_1",
            language: "default",
            type: "article",
            collection: "default",
            lastModified: "2024-01-01T00:00:00Z",
            workflow: "default",
            workflowStep: "published",
            sitemapLocations: [],
          },
          elements: {},
        },
      ],
    },
    images: {
      type: ElementType.Asset,
      name: "Images",
      value: [
        {
          url: "https://example.com/image?size=100#anchor",
          name: "test.png",
          description: null,
          type: "image/png",
          size: 1000,
          width: 100,
          height: 100,
          renditions: {},
        },
      ],
    },
    count: {
      type: ElementType.Number,
      name: "Count",
      value: 42.5,
    },
    keyword: {
      type: ElementType.Text,
      name: "Keyword",
      value: "true",
    },
    description: {
      type: ElementType.Text,
      name: "Description",
      value: "Don't forget the basics\nThey're important",
    },
  },
} as const satisfies FrontmatterTestItem;

describe("toFrontmatter", () => {
  it("escapes special characters in YAML values", () => {
    const result = toFrontmatter(frontmatterTestItem, {
      system: ["name", "workflow", "workflowStep"],
      elements: ["category", "options", "related", "images", "count", "keyword", "description"],
    });

    expect(result).toMatchInlineSnapshot(`
      "---
      name: 'Guide: Part One'
      workflow: 'true'
      workflowStep: Say "Hello"
      category: ['Type: Article']
      options: ['Option #1', 'Option: Two']
      related: ['Article: The Guide']
      images: [https://example.com/image?size=100#anchor]
      count: 42.5
      keyword: 'true'
      description: "Don't forget the basics\\nThey're important"
      ---"
    `);
  });

  it("shows current behavior with invalid system property", () => {
    const result = toFrontmatter(frontmatterTestItem, {
      // @ts-expect-error - testing invalid system property
      system: ["name", "invalid_system_prop"],
      // @ts-expect-error - testing invalid element
      elements: ["invalid_element"],
    });

    expect(result).toMatchInlineSnapshot(`
      "---
      name: 'Guide: Part One'
      ---"
    `);
  });
});
