import type { PatchOperation as PatchOperationType } from "../../../types/patchOperation.js";
import { countPatchOps } from "../../utils/diffCounts.js";
import { PatchOperation } from "../operations/PatchOperation.js";
import { SimpleSection } from "../SimpleSection.js";

type AssetFoldersSectionProps = Readonly<{
  assetFolders: ReadonlyArray<PatchOperationType>;
}>;

export const AssetFoldersSection = ({ assetFolders }: AssetFoldersSectionProps) => {
  if (assetFolders.length === 0) {
    return (
      <SimpleSection id="assetFolders" header={<div>Asset folders</div>}>
        <p>No changes to asset folders.</p>
      </SimpleSection>
    );
  }

  const counts = countPatchOps(assetFolders);

  return (
    <SimpleSection
      id="assetFolders"
      header={
        <>
          <div>Asset folders</div>
          <div className="num-added push">+ {counts.added}</div>
          <div className="num-removed">− {counts.removed}</div>
        </>
      }
    >
      {assetFolders.map((op, i) => (
        <PatchOperation key={`asset-folder-op-${op.op}-${op.path}-${i}`} operation={op} />
      ))}
    </SimpleSection>
  );
};
