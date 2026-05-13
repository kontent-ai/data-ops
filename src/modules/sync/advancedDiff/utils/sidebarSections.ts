import type { SyncEntityName } from "../../constants/entities.js";
import type { DiffModel, DiffObject } from "../../types/diffModel.js";
import type { PatchOperation } from "../../types/patchOperation.js";
import { countDiffObject, countPatchOps } from "./diffCounts.js";

type NumericSidebarItem = Readonly<{
  kind: "numeric";
  entityName: SyncEntityName;
  sectionId: string;
  title: string;
  added: number;
  modified: number;
  removed: number;
}>;

type LabelSidebarItem = Readonly<{
  kind: "label";
  entityName: SyncEntityName;
  sectionId: string;
  title: string;
  changeLabel: string | null;
}>;

export type SidebarItem = NumericSidebarItem | LabelSidebarItem;

const entityMeta: ReadonlyArray<
  Readonly<{ entityName: SyncEntityName; sectionId: string; title: string }>
> = [
  { entityName: "contentTypes", sectionId: "types", title: "Content types" },
  { entityName: "contentTypeSnippets", sectionId: "snippets", title: "Snippets" },
  { entityName: "taxonomies", sectionId: "taxonomies", title: "Taxonomy groups" },
  { entityName: "assetFolders", sectionId: "assetFolders", title: "Asset folders" },
  { entityName: "collections", sectionId: "collections-section", title: "Collections" },
  { entityName: "languages", sectionId: "languages", title: "Languages" },
  { entityName: "livePreview", sectionId: "live-preview", title: "Live Preview" },
  { entityName: "spaces", sectionId: "spaces", title: "Spaces" },
  { entityName: "workflows", sectionId: "workflows", title: "Workflows" },
];

const diffObjectKey: Partial<Record<SyncEntityName, keyof DiffModel>> = {
  contentTypes: "contentTypes",
  contentTypeSnippets: "contentTypeSnippets",
  taxonomies: "taxonomyGroups",
  languages: "languages",
  spaces: "spaces",
  workflows: "workflows",
};

const patchOpsKey: Partial<Record<SyncEntityName, keyof DiffModel>> = {
  collections: "collections",
  assetFolders: "assetFolders",
};

const computeSidebarItem = (
  entityName: SyncEntityName,
  sectionId: string,
  title: string,
  diffModel: DiffModel,
): SidebarItem => {
  if (entityName === "livePreview") {
    const lp = diffModel.livePreview;
    return {
      kind: "label",
      entityName,
      sectionId,
      title,
      changeLabel: lp.change === "none" ? null : lp.change,
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

export const computeSidebarItems = (
  diffModel: DiffModel,
  entities: ReadonlyArray<SyncEntityName>,
): ReadonlyArray<SidebarItem> =>
  entityMeta
    .filter((meta) => entities.includes(meta.entityName))
    .map((meta) => computeSidebarItem(meta.entityName, meta.sectionId, meta.title, diffModel));
