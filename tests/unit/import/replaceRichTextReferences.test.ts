import { describe, expect, it } from "@jest/globals";

import { replaceRichTextReferences } from "../../../src/modules/importExport/importExportEntities/entities/utils/richText";

describe("replaceRichTextReferences", () => {
  it("replaces asset references as internal id", () => {
    const id = "fc800484-332c-40ae-89a1-c88a67c722f6";
    const input = `
    <p>
      abc <figure data-asset-id="${id}"><img src="#" data-asset-id="${id}" /></figure> efgh
    </p>
    `;
    const expected = `
    <p>
      abc <figure data-asset-id="resolved"><img src="#" data-asset-id="resolved" /></figure> efgh
    </p>
    `;

    const actual = replaceRichTextReferences({
      richText: input,
      replaceAssetId: (oldId, asInternal) => {
        expect(oldId).toBe(id);
        return asInternal("resolved");
      },
      replaceItemId: alwaysThrow,
      replaceItemLinkId: alwaysThrow,
    });

    expect(actual).toBe(expected);
  });

  it("replaces asset references as external id", () => {
    const id = "ec7d6aec-54ea-479d-909b-397e7291d349";
    const input = `
    <p>
      abc <figure data-asset-id="${id}"><img src="#" data-asset-id="${id}" /></figure> efgh
    </p>
    `;
    const expected = `
    <p>
      abc <figure data-asset-external-id="resolved"><img src="#" data-asset-external-id="resolved" /></figure> efgh
    </p>
    `;

    const actual = replaceRichTextReferences({
      richText: input,
      replaceAssetId: (oldId, _, asExternal) => {
        expect(oldId).toBe(id);
        return asExternal("resolved");
      },
      replaceItemId: alwaysThrow,
      replaceItemLinkId: alwaysThrow,
    });

    expect(actual).toBe(expected);
  });

  it("replaces asset link references as internal id", () => {
    const id = "621b0d5b-4350-4b4d-b2e9-9e1e468f0680";
    const input = `
    <p>
      abc <a data-asset-id="${id}">this is a link</a> efgh
    </p>
    `;
    const expected = `
    <p>
      abc <a data-asset-id="resolved">this is a link</a> efgh
    </p>
    `;

    const actual = replaceRichTextReferences({
      richText: input,
      replaceAssetId: (oldId, asInternal) => {
        expect(oldId).toBe(id);
        return asInternal("resolved");
      },
      replaceItemId: alwaysThrow,
      replaceItemLinkId: alwaysThrow,
    });

    expect(actual).toBe(expected);
  });

  it("replaces asset link references as external id", () => {
    const id = "ef3ff6f5-c28f-4965-8f70-baad1bb03583";
    const input = `
    <p>
      abc <a data-asset-id="${id}">this is a link</a> efgh
    </p>
    `;
    const expected = `
    <p>
      abc <a data-asset-external-id="resolved">this is a link</a> efgh
    </p>
    `;

    const actual = replaceRichTextReferences({
      richText: input,
      replaceAssetId: (oldId, _, asExternal) => {
        expect(oldId).toBe(id);
        return asExternal("resolved");
      },
      replaceItemId: alwaysThrow,
      replaceItemLinkId: alwaysThrow,
    });

    expect(actual).toBe(expected);
  });

  it("replaces item link references as internal id", () => {
    const id = "100703af-5f9d-43d2-9de9-8ca9f8e7ba96";
    const input = `
    <p>
      abc <a data-item-id="${id}">this is a link</a> efgh
    </p>
    `;
    const expected = `
    <p>
      abc <a data-item-id="resolved">this is a link</a> efgh
    </p>
    `;

    const actual = replaceRichTextReferences({
      richText: input,
      replaceItemLinkId: (oldId, asInternal) => {
        expect(oldId).toBe(id);
        return asInternal("resolved");
      },
      replaceAssetId: alwaysThrow,
      replaceItemId: alwaysThrow,
    });

    expect(actual).toBe(expected);
  });

  it("replaces item link references as external id", () => {
    const id = "ad997dbd-3695-49a9-bbf9-e699ec018680";
    const input = `
    <p>
      abc <a data-item-id="${id}">this is a link</a> efgh
    </p>
    `;
    const expected = `
    <p>
      abc <a data-item-external-id="resolved">this is a link</a> efgh
    </p>
    `;

    const actual = replaceRichTextReferences({
      richText: input,
      replaceItemLinkId: (oldId, _, asExternal) => {
        expect(oldId).toBe(id);
        return asExternal("resolved");
      },
      replaceAssetId: alwaysThrow,
      replaceItemId: alwaysThrow,
    });

    expect(actual).toBe(expected);
  });

  it("replaces item references as internal id", () => {
    const id = "58945f94-74a6-48b3-a49f-e7d9701f1b25";
    const input = `
    <p>
      abc <object type="application/kenticocloud" data-type="item" data-id="${id}"></object> efgh
    </p>
    `;
    const expected = `
    <p>
      abc <object type="application/kenticocloud" data-type="item" data-id="resolved"></object> efgh
    </p>
    `;

    const actual = replaceRichTextReferences({
      richText: input,
      replaceItemId: (oldId, asInternal) => {
        expect(oldId).toBe(id);
        return asInternal("resolved");
      },
      replaceAssetId: alwaysThrow,
      replaceItemLinkId: alwaysThrow,
    });

    expect(actual).toBe(expected);
  });

  it("replaces item references as external id", () => {
    const id = "f0998631-9330-4216-a3ac-02d88fe01415";
    const input = `
    <p>
      abc <object type="application/kenticocloud" data-type="item" data-id="${id}"></object> efgh
    </p>
    `;
    const expected = `
    <p>
      abc <object type="application/kenticocloud" data-type="item" data-external-id="resolved"></object> efgh
    </p>
    `;

    const actual = replaceRichTextReferences({
      richText: input,
      replaceItemId: (oldId, _, asExternal) => {
        expect(oldId).toBe(id);
        return asExternal("resolved");
      },
      replaceAssetId: alwaysThrow,
      replaceItemLinkId: alwaysThrow,
    });

    expect(actual).toBe(expected);
  });
});

const alwaysThrow = () => {
  throw new Error("Not implemened...");
};
