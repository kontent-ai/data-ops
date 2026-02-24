import { isOp } from "../../../sync/utils.js";
import type { DiffObject } from "../../../types/diffModel.js";
import type { PatchOperation } from "../../../types/patchOperation.js";
import { getTargetCodename } from "../../../types/patchOperation.js";
import { AddedEntity } from "../shared/added/AddedEntity.js";
import { DiffObjectSection } from "../shared/DiffObjectSection.js";

type AssetFoldersSectionProps = Readonly<{
  assetFolders: ReadonlyArray<PatchOperation>;
}>;

type AssetFolderEntity = Readonly<{
  codename: string;
  name: string;
  folders: ReadonlyArray<AssetFolderEntity>;
}>;

const stripNestedEntityPrefix = (op: PatchOperation, codename: string): PatchOperation => {
  const marker = `/codename:${codename}`;
  const idx = op.path.lastIndexOf(marker);
  if (idx < 0) {
    return op;
  }
  const stripped = op.path.slice(idx + marker.length);
  return { ...op, path: stripped || marker } as PatchOperation;
};

const toDiffObject = (ops: ReadonlyArray<PatchOperation>): DiffObject<AssetFolderEntity> => {
  const addIntoOps = ops.filter(isOp("addInto"));
  const added = addIntoOps
    .filter((op) => op.path === "")
    .map((op) => op.value as AssetFolderEntity);

  const deleted = new Set(
    ops.filter(isOp("remove")).flatMap((op) => {
      const codename = getTargetCodename(op);
      return codename ? [codename] : [];
    }),
  );

  const nestedAdds = addIntoOps.filter((op) => op.path !== "");

  const updated = new Map(
    [...Map.groupBy([...ops.filter(isOp("replace")), ...nestedAdds], getTargetCodename)].flatMap(
      ([codename, ops]) =>
        codename !== null
          ? [
              [codename, ops.map((op) => stripNestedEntityPrefix(op, codename))] as [
                string,
                PatchOperation[],
              ],
            ]
          : [],
    ),
  );

  return { added, deleted, updated };
};

const AddedAssetFolder = ({
  folder,
  depth = 0,
}: Readonly<{ folder: AssetFolderEntity; depth?: number }>) => (
  <ul className="term">
    <li>
      {folder.name}
      {depth < 2 &&
        folder.folders.length > 0 &&
        folder.folders.map((child) => (
          <AddedAssetFolder key={child.codename} folder={child} depth={depth + 1} />
        ))}
    </li>
  </ul>
);

export const AssetFoldersSection = ({ assetFolders }: AssetFoldersSectionProps) => {
  return (
    <DiffObjectSection
      id="assetFolders"
      title="Asset folders"
      noChangesMessage="No changes to asset folders."
      diffObject={toDiffObject(assetFolders)}
      renderAddedEntity={(folder) => (
        <AddedEntity key={folder.codename} codename={folder.codename}>
          {folder.folders.map((child) => (
            <AddedAssetFolder key={child.codename} folder={child} />
          ))}
        </AddedEntity>
      )}
    />
  );
};
