import type { ManagementClient } from "@kontent-ai/management-sdk";
import { describe, expect, it, vi } from "vitest";

import { addSnippetsReferences } from "../../../src/modules/sync/sync/snippets.ts";
import type { PatchOperation } from "../../../src/modules/sync/types/patchOperation.ts";

type AddIntoOps = ReadonlyArray<
  Readonly<[string, ReadonlyArray<Extract<PatchOperation, { op: "addInto" }>>]>
>;

const createMockClient = () => {
  const toPromise = vi.fn().mockResolvedValue({});
  const withData = vi.fn().mockReturnValue({ toPromise });
  const byTypeCodename = vi.fn().mockReturnValue({ withData });
  const modifyContentTypeSnippet = vi.fn().mockReturnValue({ byTypeCodename });

  return {
    client: { modifyContentTypeSnippet } as unknown as ManagementClient,
    modifyContentTypeSnippet,
    byTypeCodename,
    withData,
  };
};

const linkedItemsElement = {
  type: "modular_content",
  codename: "related_articles",
  name: "Related articles",
  allowed_content_types: [{ codename: "article" }],
} as const;

const addIntoElementOp = (element: unknown): Extract<PatchOperation, { op: "addInto" }> => ({
  op: "addInto",
  path: "/elements",
  value: element,
});

const logOptions = { logLevel: "none" } as const;

describe("addSnippetsReferences", () => {
  it("restores references of elements added into existing snippets when no snippet was added", async () => {
    const { client, modifyContentTypeSnippet, byTypeCodename, withData } = createMockClient();
    const updateSnippetAddIntoOps: AddIntoOps = [
      ["existing_snippet", [addIntoElementOp(linkedItemsElement)]],
    ];

    await addSnippetsReferences(client, updateSnippetAddIntoOps, [], logOptions);

    expect(modifyContentTypeSnippet).toHaveBeenCalledTimes(1);
    expect(byTypeCodename).toHaveBeenCalledWith("existing_snippet");
    expect(withData).toHaveBeenCalledWith([
      {
        op: "replace",
        path: "/elements/codename:related_articles/allowed_content_types",
        value: [{ codename: "article" }],
      },
    ]);
  });

  it("does not call the client when a referencing element has no type restrictions", async () => {
    const { client, modifyContentTypeSnippet } = createMockClient();
    const unrestrictedElement = { ...linkedItemsElement, allowed_content_types: [] };
    const updateSnippetAddIntoOps: AddIntoOps = [
      ["existing_snippet", [addIntoElementOp(unrestrictedElement)]],
    ];

    await addSnippetsReferences(client, updateSnippetAddIntoOps, [], logOptions);

    expect(modifyContentTypeSnippet).not.toHaveBeenCalled();
  });
});
