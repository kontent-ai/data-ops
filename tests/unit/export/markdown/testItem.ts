import { type Elements, ElementType, type IContentItem } from "@kontent-ai/delivery-sdk";

type CalloutType = IContentItem<{
  readonly title: Elements.TextElement;
  readonly main_text: Elements.TextElement;
}>;

export type TestItemType = IContentItem<
  {
    readonly text_element: Elements.TextElement;
    readonly rich_text_element: Elements.RichTextElement;
    readonly datetime_element: Elements.DateTimeElement;
    readonly asset_element: Elements.AssetsElement;
    readonly linked_element: Elements.LinkedItemsElement<CalloutType>;
    readonly number_element: Elements.NumberElement;
    readonly url_slug: Elements.UrlSlugElement;
    readonly description: Elements.TextElement;
  },
  string,
  string,
  string,
  string,
  string
>;

export const testItem = {
  elements: {
    text_element: {
      name: "Text Element",
      type: ElementType.Text,
      value: "Introduction to Data Operations",
    },
    datetime_element: {
      name: "DateTime Element",
      type: ElementType.DateTime,
      value: "2026-01-15T10:30:00Z",
      displayTimeZone: "Europe/Prague",
    },
    asset_element: {
      name: "Asset Element",
      type: ElementType.Asset,
      value: [
        {
          name: "kaipurple.png",
          description: null,
          type: "image/png",
          size: 7677,
          url: "https://assets-eu-01.kc-usercontent.com:443/5af9ee81-dbce-01a5-f743-3d164a0456b9/490bdb56-5a24-4322-98e1-0fc26b3b5f61/kaipurple%20%281%29.png",
          width: 318,
          height: 318,
          renditions: {},
        },
      ],
    },
    linked_element: {
      name: "Linked Element",
      type: ElementType.ModularContent,
      value: ["important_note", "quick_tip"],
      linkedItems: [
        {
          elements: {
            title: {
              name: "Title",
              type: ElementType.Text,
              value: "Important Note",
            },
            main_text: {
              name: "Main Text",
              type: ElementType.Text,
              value: "Always validate your data before migration to prevent unexpected issues.",
            },
          },
          system: {
            codename: "important_note",
            collection: "default",
            id: "74d7edbf-8962-4973-ae6b-032d6ac39cb9",
            language: "default",
            lastModified: "2026-01-06T12:47:45.3462609Z",
            name: "Important Note",
            sitemapLocations: [],
            type: "callout",
            workflowStep: "published",
            workflow: "default",
          },
        },
        {
          elements: {
            title: {
              name: "Title",
              type: ElementType.Text,
              value: "Quick Tip",
            },
            main_text: {
              name: "Main Text",
              type: ElementType.Text,
              value: "Use environment variables to manage API keys securely.",
            },
          },
          system: {
            codename: "quick_tip",
            collection: "default",
            id: "38c5118b-1441-4dde-8277-640d291487a7",
            language: "default",
            lastModified: "2026-01-06T12:47:46.8813894Z",
            name: "Quick Tip",
            sitemapLocations: [],
            type: "callout",
            workflowStep: "published",
            workflow: "default",
          },
        },
      ],
    },
    number_element: {
      name: "Number Element",
      type: ElementType.Number,
      value: 42.5,
    },
    url_slug: {
      name: "Url Slug",
      type: ElementType.UrlSlug,
      value: "data-operations-guide",
    },
    description: {
      name: "Description",
      type: ElementType.Text,
      value:
        "This guide covers essential data operations workflows. It provides practical examples for content migration and synchronization tasks.",
    },
    rich_text_element: {
      images: [],
      linkedItemCodenames: ["important_note", "b3d20acb_47fc_0150_c2bd_48212ee08ca1"],
      linkedItems: [
        {
          elements: {
            title: {
              name: "Title",
              type: ElementType.Text,
              value: "Important Note",
            },
            main_text: {
              name: "Main Text",
              type: ElementType.Text,
              value: "Always validate your data before migration to prevent unexpected issues.",
            },
          },
          system: {
            codename: "important_note",
            collection: "default",
            id: "74d7edbf-8962-4973-ae6b-032d6ac39cb9",
            language: "default",
            lastModified: "2026-01-06T12:47:45.3462609Z",
            name: "Important Note",
            sitemapLocations: [],
            type: "callout",
            workflowStep: "published",
            workflow: "default",
          },
        },
        {
          elements: {
            title: {
              name: "Title",
              type: ElementType.Text,
              value: "Component Callout",
            },
            main_text: {
              name: "Main Text",
              type: ElementType.Text,
              value: "This callout is embedded as a component in the rich text.",
            },
          },
          system: {
            codename: "b3d20acb_47fc_0150_c2bd_48212ee08ca1",
            collection: "default",
            id: "b3d20acb-47fc-0150-c2bd-48212ee08ca1",
            language: "default",
            lastModified: "2026-01-06T12:50:48.0829289Z",
            name: "b3d20acb-47fc-0150-c2bd-48212ee08ca1",
            sitemapLocations: [],
            type: "callout",
            workflowStep: null,
            workflow: null,
          },
        },
      ],
      links: [],
      name: "Rich Text element",
      type: ElementType.RichText,
      value:
        '<h2>Rich Text Showcase</h2>\n<p>This paragraph demonstrates basic formatting with <strong>bold</strong> and <em>italic</em> text.</p>\n<h3>Features</h3>\n<p>Here are the key capabilities:</p>\n<ul>\n  <li>Text formatting (bold, italic)\n    <ul>\n      <li>Bold text for emphasis</li>\n      <li>Italic text for subtle highlights</li>\n    </ul>\n  </li>\n  <li>Structured content with headings\n    <ul>\n      <li>H1 for main titles</li>\n      <li>H2 for sections</li>\n    </ul>\n  </li>\n  <li>Lists and nested content</li>\n</ul>\n<h3>Step-by-Step Guide</h3>\n<ol>\n  <li>Create your content model\n    <ol>\n      <li>Define content types</li>\n      <li>Add elements</li>\n    </ol>\n  </li>\n  <li>Add rich text elements\n    <ol>\n      <li>Configure formatting options</li>\n      <li>Set up components</li>\n    </ol>\n  </li>\n  <li>Publish your content</li>\n</ol>\n<object type="application/kenticocloud" data-type="item" data-rel="link" data-codename="important_note"></object>\n<p>This text separates the linked item from the component below, providing clear content division.</p>\n<object type="application/kenticocloud" data-type="item" data-rel="component" data-codename="b3d20acb_47fc_0150_c2bd_48212ee08ca1"></object>\n<h3>Code Example</h3>\n<p>When working with the SDK, use methods like <code>client.item(\'my_article\').toPromise()</code> to fetch content items, or access elements via <code>contentItem.elements.richText.value</code> for processing rich text data.</p>\n<p>Learn more about content management at <a href="https://kontent.ai">Kontent.ai</a>.</p>',
    },
  },
  system: {
    codename: "data_ops_test_item",
    collection: "default",
    id: "b237ab40-bd32-4f85-989c-406e2d3cd471",
    language: "default",
    lastModified: "2026-01-06T12:50:48.0829289Z",
    name: "Data Ops Test Item",
    sitemapLocations: [],
    type: "data_ops_test_type",
    workflowStep: "published",
    workflow: "default",
  },
} as const satisfies TestItemType;
