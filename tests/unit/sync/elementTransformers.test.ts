import { describe, expect, it } from "@jest/globals";
import {
  AssetContracts,
  ContentItemContracts,
  ContentTypeContracts,
  ContentTypeElements,
  TaxonomyContracts,
} from "@kontent-ai/management-sdk";

import { LogOptions } from "../../../src/log";
import {
  transformAssetElement,
  transformCustomElement,
  transformDefaultElement,
  transformGuidelinesElement,
  transformLinkedItemsElement,
  transformMultipleChoiceElement,
  transformRichTextElement,
  transformSnippetElement,
  transformSubpagesElement,
  transformTaxonomyElement,
  transformUrlSlugElement,
} from "../../../src/modules/sync/modelTransfomers/elementTransformers";
import { ContentTypeSnippetsWithUnionElements, SnippetElement } from "../../../src/modules/sync/types/contractModels";

const logOptions: LogOptions = {
  logLevel: "none",
  verbose: false,
};

const createSnippet = (
  elements: SnippetElement[],
): ContentTypeSnippetsWithUnionElements => ({
  id: "snippetId",
  name: "snippet",
  codename: "snippet",
  last_modified: "date",
  elements,
});

const commonElementProps = {
  id: "objectId",
  name: "object name",
  codename: "object_codename",
};

const dummyElement: ContentTypeElements.Element = {
  id: "textElementId",
  codename: "text_codename",
  name: "element",
  type: "text",
};

const assets = [
  {
    id: "fe374bc8-8f90-4620-887c-eec5cda3ebbf",
    codename: "asset_1",
    file_name: "asset Id",
    external_id: "assetExtId1",
    title: "",
    image_height: 0,
    image_width: 0,
    size: 0,
    type: "",
    file_reference: {
      id: "",
      type: "internal",
    },
    url: "",
    last_modified: "",
    descriptions: [],
  },
] as const satisfies ReadonlyArray<AssetContracts.IAssetModelContract>;

const contentTypes = [
  {
    id: "contentTypeId1",
    name: "content type 1",
    codename: "content_type_1",
    last_modified: "",
    elements: [dummyElement],
    external_id: "contentTypeExtId1",
  },
] as const satisfies ReadonlyArray<ContentTypeContracts.IContentTypeContract>;

const items = [
  {
    id: "b76bb734-b37d-49b3-beb0-a543399e8abd",
    name: "item 1",
    codename: "item_1",
    type: { id: contentTypes[0].id },
    last_modified: new Date(),
    collection: { id: "" },
  },
] as const satisfies ReadonlyArray<ContentItemContracts.IContentItemModelContract>;

const taxonomyGroups = [
  {
    id: "taxonomyGroupId1",
    name: "taxonomy group 1",
    codename: "taxonomy_group_1",
    last_modified: "",
    external_id: "taxonomyGroupExtId1",
    terms: [{
      id: "termId1",
      name: "term 1",
      codename: "term_1",
      last_modified: "",
      external_id: "termExtId1",
      terms: [
        {
          id: "termId2",
          name: "term 2",
          codename: "term_2",
          last_modified: "",
          terms: [],
        },
      ],
    }],
  },
] as const satisfies ReadonlyArray<TaxonomyContracts.ITaxonomyContract>;

describe("elementTransfomers test", () => {
  it("transformCustomElement correctly transforms element", () => {
    const element: ContentTypeElements.ICustomElement = {
      ...commonElementProps,
      type: "custom",
      codename: "custom_element",
      source_url: "url",
      allowed_elements: [
        {
          id: "textElementId",
        },
      ],
    };
    const snippet = createSnippet([element, dummyElement]);

    const expectedOutput = {
      ...element,
      id: undefined,
      external_id: undefined,
      allowed_elements: [
        {
          codename: dummyElement.codename,
        },
      ],
    };

    const transformedElement = transformCustomElement(element, snippet);

    expect(transformedElement).toEqual(expectedOutput);
  });

  it("transformMultipleChoiceElement correctly transforms element", () => {
    const element: ContentTypeElements.IMultipleChoiceElement = {
      ...commonElementProps,
      type: "multiple_choice",
      mode: "single",
      default: { global: { value: [{ id: "firstOptionId" }] } },
      options: [
        {
          name: "firstOption",
          id: "firstOptionId",
          codename: "first_option",
          external_id: "firstOptionExtId",
        },
        {
          name: "secondOption",
          id: "secondOptionId",
          codename: "second_option",
        },
      ],
    };

    const expectedOutput = {
      ...element,
      id: undefined,
      external_id: undefined,
      default: { global: { value: [{ codename: element.options[0]?.codename }] } },
      options: [
        {
          ...element.options[0],
          id: undefined,
          external_id: undefined,
        },
        {
          ...element.options[1],
          id: undefined,
          external_id: undefined,
        },
      ],
    };

    const transformedElement = transformMultipleChoiceElement(element);

    expect(transformedElement).toEqual(expectedOutput);
  });

  it("transformAssetElement correctly transforms element", () => {
    const element: ContentTypeElements.IAssetElement = {
      ...commonElementProps,
      type: "asset",
      default: { global: { value: [{ id: assets[0].id }] } },
    };

    const expectedOutput = {
      ...element,
      id: undefined,
      external_id: undefined,
      default: { global: { value: [{ external_id: assets[0].external_id, codename: assets[0].codename }] } },
    };

    const transformedElement = transformAssetElement(element, assets, logOptions);

    expect(transformedElement).toEqual(expectedOutput);
  });

  it("transformAssetElement correctly transforms element with missing asset", () => {
    const element: ContentTypeElements.IAssetElement = {
      ...commonElementProps,
      type: "asset",
      default: { global: { value: [{ id: assets[0].id }] } },
    };

    const expectedOutput = {
      ...element,
      id: undefined,
      external_id: undefined,
      default: undefined,
    };

    const transformedElement = transformAssetElement(element, [], logOptions);

    expect(transformedElement).toEqual(expectedOutput);
  });

  it("transformRichText correctly transforms element", () => {
    const element: ContentTypeElements.IRichTextElement = {
      ...commonElementProps,
      type: "rich_text",
      allowed_content_types: [{ id: "contentTypeId1" }],
      allowed_item_link_types: [{ id: "contentTypeId1" }],
    };

    const expectedOutput = {
      ...element,
      id: undefined,
      external_id: undefined,
      allowed_content_types: [{ codename: contentTypes[0].codename }],
      allowed_item_link_types: [{ codename: contentTypes[0].codename }],
    };

    const transformedElement = transformRichTextElement(element, contentTypes, logOptions);

    expect(transformedElement).toEqual(expectedOutput);
  });

  it("transformRichText correctly transforms element with missing content types", () => {
    const element: ContentTypeElements.IRichTextElement = {
      ...commonElementProps,
      type: "rich_text",
      allowed_content_types: [{ id: "contentTypeId1" }],
      allowed_item_link_types: [{ id: "contentTypeId1" }],
    };

    const expectedOutput = {
      ...element,
      id: undefined,
      external_id: undefined,
      allowed_content_types: [],
      allowed_item_link_types: [],
    };

    const transformedElement = transformRichTextElement(element, [], logOptions);

    expect(transformedElement).toEqual(expectedOutput);
  });

  it("transformTaxonomyElement correctly transforms element", () => {
    const element: ContentTypeElements.ITaxonomyElement = {
      ...commonElementProps,
      type: "taxonomy",
      taxonomy_group: {
        id: "taxonomyGroupId1",
      },
      default: {
        global: { value: [{ id: taxonomyGroups[0].terms[0].id }, { id: taxonomyGroups[0].terms[0].terms[0].id }] },
      },
    };

    const expectedOutput = {
      ...element,
      id: undefined,
      external_id: undefined,
      taxonomy_group: {
        codename: taxonomyGroups[0].codename,
      },
      default: {
        global: {
          value: [
            {
              codename: taxonomyGroups[0].terms[0].codename,
            },
            {
              codename: taxonomyGroups[0].terms[0].terms[0].codename,
            },
          ],
        },
      },
    };

    const transformedElement = transformTaxonomyElement(element, taxonomyGroups, logOptions);

    expect(transformedElement).toEqual(expectedOutput);
  });

  it("transformLinkedItemsElement correctly transforms element", () => {
    const element: ContentTypeElements.ILinkedItemsElement = {
      ...commonElementProps,
      type: "modular_content",
      default: {
        global: { value: [{ id: items[0].id }] },
      },
      allowed_content_types: [{ id: contentTypes[0].id }],
    };

    const expectedOutput = {
      ...element,
      id: undefined,
      external_id: undefined,
      default: {
        global: {
          value: [
            {
              codename: items[0].codename,
              external_id: items[0].id,
            },
          ],
        },
      },
      allowed_content_types: [{ codename: contentTypes[0].codename }],
    };

    const transformedElement = transformLinkedItemsElement(element, contentTypes, items, logOptions);

    expect(transformedElement).toEqual(expectedOutput);
  });

  it("transformLinkedItemsElement correctly transforms element with missing item and types", () => {
    const element: ContentTypeElements.ILinkedItemsElement = {
      ...commonElementProps,
      type: "modular_content",
      default: {
        global: { value: [{ id: items[0].id }] },
      },
      allowed_content_types: [{ id: contentTypes[0].id }],
    };

    const expectedOutput = {
      ...element,
      id: undefined,
      external_id: undefined,
      default: undefined,
      allowed_content_types: [],
    };

    const transformedElement = transformLinkedItemsElement(element, [], [], logOptions);

    expect(transformedElement).toEqual(expectedOutput);
  });

  it("transformGuidelinesElement correctly transforms element", () => {
    const guidelines = `<p>Item links: <a data-item-id="${
      items[0].id
    }">Item Link 1</a></p>\n<p>Asset Link: <a data-asset-id="${
      assets[0].id
    }">Asset Link 1</a></p>\n<figure data-asset-id="${assets[0].id}"><img src="#" data-asset-id="${
      assets[0].id
    }"></figure>`;
    const element: ContentTypeElements.IGuidelinesElement = {
      ...commonElementProps,
      type: "guidelines",
      guidelines: guidelines,
    };

    const expectedOutput = {
      ...element,
      id: undefined,
      external_id: undefined,
      guidelines: `<p>Item links: <a data-item-codename="${items[0].codename}" data-item-external-id="${
        items[0].id
      }">Item Link 1</a></p>\n<p>Asset Link: <a data-asset-codename="${assets[0].codename}" data-asset-external-id="${
        assets[0].external_id
      }">Asset Link 1</a></p>\n<figure data-asset-codename="${assets[0].codename}" data-asset-external-id="${
        assets[0].external_id
      }"><img src="#" data-asset-codename="${assets[0].codename}" data-asset-external-id="${
        assets[0].external_id
      }"></figure>`,
    };

    const transformedElement = transformGuidelinesElement(element, assets, items, logOptions);

    expect(transformedElement).toEqual(expectedOutput);
  });

  it("transformDefaultElement correctly transforms element", () => {
    const transformedElement = transformDefaultElement(dummyElement);

    expect(transformedElement).toEqual(
      {
        ...dummyElement,
        external_id: undefined,
        id: undefined,
      },
    );
  });

  it("transformUrlSlugElement correctly transform element with depends only on type element", () => {
    const element: ContentTypeElements.IUrlSlugElement = {
      ...commonElementProps,
      type: "url_slug",
      depends_on: {
        element: { id: contentTypes[0].elements[0].id },
      },
    };

    const expectedOutput = {
      ...element,
      id: undefined,
      external_id: undefined,
      depends_on: {
        element: { codename: contentTypes[0].elements[0].codename },
      },
    };

    expect(transformUrlSlugElement(element, contentTypes[0], [])).toEqual(expectedOutput);
  });

  it("transformUrlSlugElement correctly transform element with depending on snippet element", () => {
    const snippet = createSnippet([dummyElement]);

    const element: ContentTypeElements.IUrlSlugElement = {
      ...commonElementProps,
      type: "url_slug",
      depends_on: {
        element: { id: contentTypes[0].elements[0].id },
        snippet: { id: snippet.id },
      },
    };

    const expectedOutput = {
      ...element,
      id: undefined,
      external_id: undefined,
      depends_on: {
        element: { codename: contentTypes[0].elements[0].codename },
        snippet: { codename: snippet.codename },
      },
    };

    const trasnformedElement = transformUrlSlugElement(element, contentTypes[0], [snippet]);

    expect(trasnformedElement).toEqual(expectedOutput);
  });

  it("transformUrlSlugElement with missing snippet throw error", () => {
    const snippet = createSnippet([dummyElement]);

    const element: ContentTypeElements.IUrlSlugElement = {
      ...commonElementProps,
      type: "url_slug",
      depends_on: {
        element: { id: contentTypes[0].elements[0].id },
        snippet: { id: snippet.id },
      },
    };

    const transformElementCode = () => transformUrlSlugElement(element, contentTypes[0], []);

    expect(transformElementCode).toThrowError();
  });

  it("transformSnippetElement correctly transform element", () => {
    const snippet = createSnippet([dummyElement]);

    const element: ContentTypeElements.ISnippetElement = {
      ...commonElementProps,
      type: "snippet",
      snippet: { id: snippet.id },
    };

    const expectedOutput = {
      ...element,
      id: undefined,
      external_id: undefined,
      snippet: { codename: snippet.codename },
    };

    expect(transformSnippetElement(element, [snippet])).toEqual(expectedOutput);
  });

  it("transformSubpagesElement correctly transforms element", () => {
    const element: ContentTypeElements.ISubpagesElement = {
      ...commonElementProps,
      type: "subpages",
      allowed_content_types: [{
        id: contentTypes[0].id,
      }],
    };

    const expectedOutput = {
      ...element,
      id: undefined,
      external_id: undefined,
      allowed_content_types: [{
        codename: contentTypes[0].codename,
      }],
    };

    expect(transformSubpagesElement(element, contentTypes, items, logOptions)).toEqual(expectedOutput);
  });
});
