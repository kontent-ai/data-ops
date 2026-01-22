import { ElementType } from "@kontent-ai/delivery-sdk";
import { describe, expect, it } from "vitest";

import { toMarkdown } from "../../../../src/modules/export/markdown/markdown.ts";
import { testItem } from "./testItem.ts";

describe("toMarkdown", () => {
  it("converts content item to markdown with default settings (all elements, full system frontmatter)", async () => {
    const result = toMarkdown(testItem);

    await expect(result).toMatchFileSnapshot("./snapshots/toMarkdownDefault.md");
  });

  it("converts content item to markdown without header when frontMatter is false", async () => {
    const result = toMarkdown(testItem, { frontMatter: false });

    await expect(result).toMatchFileSnapshot("./snapshots/toMarkdownNoHeader.md");
  });

  it("converts content item with custom frontmatter (selected system and element properties)", async () => {
    const result = toMarkdown(testItem, {
      frontMatter: {
        system: ["codename", "name", "type"],
        elements: ["number_element", "asset_element", "url_slug"],
      },
    });

    await expect(result).toMatchFileSnapshot("./snapshots/toMarkdownCustomFrontmatter.md");
  });

  it("converts content item with selected elements in specified order", async () => {
    const result = toMarkdown(testItem, {
      elements: {
        rich_text_element: true,
        text_element: true,
        number_element: true,
      },
      frontMatter: false,
    });

    await expect(result).toMatchFileSnapshot("./snapshots/toMarkdownCustomOrder.md");
  });

  it("converts linked items using custom resolver that expands content", async () => {
    const result = toMarkdown(testItem, {
      frontMatter: false,
      resolvers: {
        [ElementType.ModularContent]: (el) =>
          el.linkedItems
            .map((item) => `> ${item.system.name}\n>\n> ${item.elements.main_text?.value}`)
            .join("\n\n"),
      },
    });

    await expect(result).toMatchFileSnapshot("./snapshots/toMarkdownCustomResolvers.md");
  });

  it("converts text element using custom element resolver", async () => {
    const result = toMarkdown(testItem, {
      elements: {
        text_element: (el) => `# ${el.value}`,
        description: true,
        rich_text_element: true,
        number_element: true,
        asset_element: true,
        url_slug: true,
      },
    });

    await expect(result).toMatchFileSnapshot("./snapshots/toMarkdownCustomElementResolver.md");
  });
});
