import type { SyncEntityName } from "../../constants/entities.js";
import type { DiffModel, DiffObject } from "../../types/diffModel.js";
import type { PatchOperation } from "../../types/patchOperation.js";
import { countDiffObject, countPatchOps } from "./diffCounts.js";

type NumericSectionCount = Readonly<{
  kind: "numeric";
  entityName: SyncEntityName;
  sectionId: string;
  title: string;
  added: number;
  modified: number;
  removed: number;
}>;

type LabelSectionCount = Readonly<{
  kind: "label";
  entityName: SyncEntityName;
  sectionId: string;
  title: string;
  changeLabel: string | null;
}>;

export type SidebarItem = NumericSectionCount | LabelSectionCount;

const entityMeta: ReadonlyArray<
  Readonly<{ entityName: SyncEntityName; sectionId: string; title: string }>
> = [
  { entityName: "contentTypes", sectionId: "types", title: "Content types" },
  { entityName: "contentTypeSnippets", sectionId: "snippets", title: "Snippets" },
  { entityName: "taxonomies", sectionId: "taxonomies", title: "Taxonomy groups" },
  { entityName: "assetFolders", sectionId: "assetFolders", title: "Asset folders" },
  { entityName: "collections", sectionId: "collections-section", title: "Collections" },
  { entityName: "languages", sectionId: "languages", title: "Languages" },
  { entityName: "webSpotlight", sectionId: "web-spotlight", title: "Web Spotlight" },
  { entityName: "spaces", sectionId: "spaces", title: "Spaces" },
  { entityName: "workflows", sectionId: "workflows", title: "Workflows" },
];

const diffObjectKey: Record<string, keyof DiffModel> = {
  contentTypes: "contentTypes",
  contentTypeSnippets: "contentTypeSnippets",
  taxonomies: "taxonomyGroups",
  languages: "languages",
  spaces: "spaces",
  workflows: "workflows",
};

const patchOpsKey: Record<string, keyof DiffModel> = {
  collections: "collections",
  assetFolders: "assetFolders",
};

const computeEntityCount = (
  entityName: SyncEntityName,
  sectionId: string,
  title: string,
  diffModel: DiffModel,
): SidebarItem => {
  if (entityName === "webSpotlight") {
    const ws = diffModel.webSpotlight;
    return {
      kind: "label",
      entityName,
      sectionId,
      title,
      changeLabel: ws.change === "none" ? null : ws.change,
    };
  }

  const diffObjKey = diffObjectKey[entityName];
  if (diffObjKey) {
    const counts = countDiffObject(diffModel[diffObjKey] as DiffObject<{ codename: string }>);
    return { kind: "numeric", entityName, sectionId, title, ...counts };
  }

  const patchKey = patchOpsKey[entityName];
  if (patchKey) {
    const counts = countPatchOps(diffModel[patchKey] as ReadonlyArray<PatchOperation>);
    return { kind: "numeric", entityName, sectionId, title, ...counts };
  }

  return { kind: "numeric", entityName, sectionId, title, added: 0, modified: 0, removed: 0 };
};

export const computeSectionCounts = (
  diffModel: DiffModel,
  entities: ReadonlyArray<SyncEntityName>,
): ReadonlyArray<SidebarItem> =>
  entityMeta
    .filter((m) => entities.includes(m.entityName))
    .map((m) => computeEntityCount(m.entityName, m.sectionId, m.title, diffModel));
