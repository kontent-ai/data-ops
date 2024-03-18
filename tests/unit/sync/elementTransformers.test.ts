import { describe, expect, it } from "@jest/globals";
import {
  AssetContracts,
  ContentItemContracts,
  ContentTypeContracts,
  ContentTypeElements,
  ContentTypeSnippetContracts,
  ElementContracts,
  TaxonomyContracts,
} from "@kontent-ai/management-sdk";

import {
  transformAssetElement,
  transformCustomElement,
  transformDefaultElement,
  transformGuidelinesElement,
  transformLinkedItemsElement,
  transformMultipleChoiceElement,
  transformRichText,
  transformTaxonomyElement,
} from "../../../src/modules/sync/modelTransfomers/elementTransformers";

const createSnippet = (
  elements: ElementContracts.IContentTypeElementContract[],
): ContentTypeSnippetContracts.IContentTypeSnippetContract => ({
  id: "snippet",
  name: "snippet",
  codename: "snippet",
  last_modified: "date",
  elements,
});

const createDefaultObject = (id: string, name: string, codename: string) => ({
  id,
  name,
  codename,
});

const dummyElement = {
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
    elements: [],
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
      ...createDefaultObject("customElementId", "custom element", "custom_element"),
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
      external_id: element.id,
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
      ...createDefaultObject("multipleChoiceElementId", "multiple choice", "multiple_choice_element"),
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
      external_id: element.id,
      default: { global: { value: [{ codename: element.options[0]?.codename }] } },
      options: [
        {
          ...element.options[0],
          id: undefined,
        },
        {
          ...element.options[1],
          id: undefined,
          external_id: element.options[1]?.id,
        },
      ],
    };

    const transformedElement = transformMultipleChoiceElement(element);

    expect(transformedElement).toEqual(expectedOutput);
  });

  it("transformAssetElement correctly transforms element", () => {
    const element: ContentTypeElements.IAssetElement = {
      ...createDefaultObject("assetElementId", "asset", "asset_element"),
      type: "asset",
      default: { global: { value: [{ id: assets[0].id }] } },
    };

    const expectedOutput = {
      ...element,
      id: undefined,
      external_id: element.id,
      default: { global: { value: [{ external_id: assets[0].external_id, codename: assets[0].codename }] } },
    };

    const transformedElement = transformAssetElement(element, assets);

    expect(transformedElement).toEqual(expectedOutput);
  });

  it("transformRichText correctly transforms element", () => {
    const element: ContentTypeElements.IRichTextElement = {
      ...createDefaultObject("richTextElementId", "rich text", "rich_text_element"),
      type: "rich_text",
      allowed_content_types: [{ id: "contentTypeId1" }],
      allowed_item_link_types: [{ id: "contentTypeId1" }],
    };

    const expectedOutput = {
      ...element,
      id: undefined,
      external_id: element.id,
      allowed_content_types: [{ codename: contentTypes[0].codename }],
      allowed_item_link_types: [{ codename: contentTypes[0].codename }],
    };

    const transformedElement = transformRichText(element, contentTypes);

    expect(transformedElement).toEqual(expectedOutput);
  });

  it("transformTaxonomyElement correctly transforms element", () => {
    const element: ContentTypeElements.ITaxonomyElement = {
      ...createDefaultObject("richTextElementId", "rich text", "rich_text_element"),
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
      external_id: element.id,
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

    const transformedElement = transformTaxonomyElement(element, taxonomyGroups);

    expect(transformedElement).toEqual(expectedOutput);
  });

  it("transformLinkedItemsElement correctly transforms element", () => {
    const element: ContentTypeElements.ILinkedItemsElement = {
      ...createDefaultObject("linkedItemsElementId", "linked items", "linked_items_element"),
      type: "modular_content",
      default: {
        global: { value: [{ id: items[0].id }] },
      },
    };

    const expectedOutput = {
      ...element,
      id: undefined,
      external_id: element.id,
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
    };

    const transformedElement = transformLinkedItemsElement(element, contentTypes, items);

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
      ...createDefaultObject("guidelinesElementId", "guidelines", "guidelines_element"),
      type: "guidelines",
      guidelines: guidelines,
    };

    const expectedOutput = {
      ...element,
      id: undefined,
      external_id: element.id,
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

    const transformedElement = transformGuidelinesElement(element, assets, items);

    expect(transformedElement).toEqual(expectedOutput);
  });

  it("transformDefaultElement correctly transforms element", () => {
    expect(transformDefaultElement(dummyElement)).toEqual(
      {
        ...dummyElement,
        id: undefined,
        external_id: dummyElement.id,
      },
    );
  });
});
