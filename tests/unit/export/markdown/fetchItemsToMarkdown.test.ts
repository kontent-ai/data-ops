import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchItemsToMarkdown } from "../../../../src/modules/export/markdown/fetchItemsToMarkdown.ts";
import { createClientDelivery } from "../../../../src/utils/client.ts";

vi.mock("../../../../src/utils/client.ts", () => ({
  createClientDelivery: vi.fn(),
}));

const mockWithParameters = vi.fn();

const createMockResponse = () => ({
  data: { responses: [{ data: { items: [] } }] },
});

const setupMockClient = () => {
  mockWithParameters.mockReturnValue({
    toAllPromise: vi.fn().mockResolvedValue(createMockResponse()),
  });

  vi.mocked(createClientDelivery).mockReturnValue({
    items: () => ({ withParameters: mockWithParameters }),
  } as unknown as ReturnType<typeof createClientDelivery>);
};

describe("fetchItemsToMarkdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockClient();
  });

  describe("preview mode", () => {
    it("creates client with preview settings when previewApiKey is provided", async () => {
      const previewApiKey = "preview-key-123";

      await fetchItemsToMarkdown({
        environmentId: "env-id",
        language: "en-US",
        items: ["item1"],
        previewApiKey,
      });

      expect(createClientDelivery).toHaveBeenCalledWith({
        environmentId: "env-id",
        previewApiKey,
        usePreviewMode: true,
        commandName: "data-export-markdown",
        baseUrl: undefined,
      });
    });

    it("creates client without preview settings when previewApiKey is not provided", async () => {
      await fetchItemsToMarkdown({
        environmentId: "env-id",
        language: "en-US",
        items: ["item1"],
      });

      expect(createClientDelivery).toHaveBeenCalledWith({
        environmentId: "env-id",
        previewApiKey: undefined,
        usePreviewMode: false,
        commandName: "data-export-markdown",
        baseUrl: undefined,
      });
    });
  });
});
