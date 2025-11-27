import { isOp } from "../../../sync/utils.js";
import type { PatchOperation as PatchOperationType } from "../../../types/patchOperation.js";
import { PatchOperation } from "../operations/PatchOperation.js";
import { SimpleSection } from "../SimpleSection.js";

type AssetFoldersSectionProps = Readonly<{
  assetFolders: ReadonlyArray<PatchOperationType>;
}>;

export const AssetFoldersSection = ({ assetFolders }: AssetFoldersSectionProps) => {
  if (assetFolders.length === 0) {
    return <h3>No changes to asset folders.</h3>;
  }

  const addedCount = assetFolders.filter(isOp("addInto")).length;
  const removedCount = assetFolders.filter(isOp("remove")).length;

  return (
    <SimpleSection
      id="assetFolders"
      header={
        <>
          <div>Asset folders</div>
          <div className="num-added push">+ {addedCount}</div>
          <div className="num-removed">− {removedCount}</div>
        </>
      }
    >
      {assetFolders.map((op) => (
        <PatchOperation key={`asset-folder-op-${op.path}`} operation={op} />
      ))}
    </SimpleSection>
  );
};
