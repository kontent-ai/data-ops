import { describe, expect, it } from "vitest";

import type { PatchOperation } from "../../../../src/modules/sync/types/patchOperation.js";
import type { DiffData } from "../../../../src/modules/sync/utils/htmlRenderers.js";
import { resolveHtmlTemplate } from "../../../../src/modules/sync/utils/htmlRenderers.js";

// Helper function to create empty entity sections with consistent structure
const createEmptyEntitySection = () => ({
  added: [] as const,
  updated: new Map<string, readonly PatchOperation[]>(),
  deleted: new Set<string>(),
});

// Helper function to create minimal DiffData for testing
const createMockDiffData = (overrides: Partial<DiffData> = {}): DiffData => ({
  taxonomyGroups: createEmptyEntitySection(),
  contentTypeSnippets: createEmptyEntitySection(),
  contentTypes: createEmptyEntitySection(),
  collections: [],
  webSpotlight: { change: "none" },
  assetFolders: [],
  spaces: createEmptyEntitySection(),
  languages: createEmptyEntitySection(),
  workflows: {
    ...createEmptyEntitySection(),
    sourceWorkflows: [],
  },
  targetEnvironmentId: "test-target",
  entities: ["taxonomies"],
  ...overrides,
});

describe("resolveHtmlTemplate", () => {
  describe("added taxonomies section", () => {
    it("renders added taxonomies with depth limitation with multiple terms at level 2", () => {
      const templateString = "{{added_taxonomies}}";

      const diffData = createMockDiffData({
        taxonomyGroups: {
          added: [
            {
              name: "Test Taxonomy",
              codename: "test_taxonomy",
              terms: [
                {
                  name: "Level 1 Term A",
                  codename: "level_1_term_a",
                  terms: [
                    {
                      name: "Level 2 Term A1",
                      codename: "level_2_term_a1",
                      terms: [
                        {
                          name: "Level 3 Term A1a",
                          codename: "level_3_term_a1a",
                          terms: [
                            {
                              name: "Level 4 Term A1a1 (should not render)",
                              codename: "level_4_term_a1a1",
                              terms: [],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      name: "Level 2 Term A2",
                      codename: "level_2_term_a2",
                      terms: [],
                    },
                    {
                      name: "Level 2 Term A3",
                      codename: "level_2_term_a3",
                      terms: [],
                    },
                    {
                      name: "Level 2 Term A4",
                      codename: "level_2_term_a4",
                      terms: [],
                    },
                    {
                      name: "Level 2 Term A5",
                      codename: "level_2_term_a5",
                      terms: [],
                    },
                  ],
                },
                {
                  name: "Level 1 Term B",
                  codename: "level_1_term_b",
                  terms: [],
                },
              ],
            },
          ],
          updated: new Map(),
          deleted: new Set(),
        },
      });

      const result = resolveHtmlTemplate(templateString, diffData);

      expect(result).toContain("test_taxonomy");

      expect(result).toContain("Level 1 Term A");
      expect(result).toContain("Level 1 Term B");

      expect(result).toContain("Level 2 Term A1");
      expect(result).toContain("Level 2 Term A2");
      expect(result).toContain("Level 2 Term A3");
      expect(result).toContain("Level 2 Term A4");
      expect(result).toContain("Level 2 Term A5");

      expect(result).toContain("Level 3 Term A1a");

      expect(result).not.toContain("Level 4 Term A1a1");
      expect(result).not.toContain("should not render");
    });

    it("renders empty result when no taxonomies are added", () => {
      const templateString = "{{added_taxonomies}}";

      const diffData = createMockDiffData({
        taxonomyGroups: {
          added: [],
          updated: new Map(),
          deleted: new Set(),
        },
      });

      const result = resolveHtmlTemplate(templateString, diffData);

      // The warning is always appended, even when there are no taxonomies
      expect(result).toBe('<div class="warning">⚠️ Only the first three depth levels shown.</div>');
    });

    it("handles taxonomy with no terms", () => {
      const templateString = "{{added_taxonomies}}";

      const diffData = createMockDiffData({
        taxonomyGroups: {
          added: [
            {
              name: "Empty Taxonomy",
              codename: "empty_taxonomy",
              terms: [],
            },
          ],
          updated: new Map(),
          deleted: new Set(),
        },
      });

      const result = resolveHtmlTemplate(templateString, diffData);

      expect(result).toContain("empty_taxonomy");
      // Note: The display uses codename, not name
      expect(result).toContain("⚠️ Only the first three depth levels shown.");
    });
  });
});
