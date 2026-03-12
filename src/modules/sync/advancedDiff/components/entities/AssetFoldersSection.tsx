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

const stripNestedEntityPrefix = (path: string, marker: string): string => {
  const idx = path.lastIndexOf(marker);
  return idx < 0 ? path : path.slice(idx + marker.length);
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
              [codename, ops.map((op) => {
                const stripped = stripNestedEntityPrefix(op.path, `/codename:${codename}`);
                return stripped ? { ...op, path: stripped } as PatchOperation : op;
              })] as [
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
