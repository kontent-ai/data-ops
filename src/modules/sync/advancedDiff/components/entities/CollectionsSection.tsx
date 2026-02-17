import type { PatchOperation as PatchOperationType } from "../../../types/patchOperation.js";
import { countPatchOps } from "../../utils/diffCounts.js";
import { PatchOperation } from "../operations/PatchOperation.js";
import { SimpleSection } from "../SimpleSection.js";

type CollectionsSectionProps = Readonly<{
  collections: ReadonlyArray<PatchOperationType>;
}>;

export const CollectionsSection = ({ collections }: CollectionsSectionProps) => {
  if (collections.length === 0) {
    return (
      <SimpleSection id="collections-section" header={<div>Collections</div>}>
        <p>No changes to collections.</p>
      </SimpleSection>
    );
  }

  const counts = countPatchOps(collections);

  return (
    <SimpleSection
      id="collections-section"
      header={
        <>
          <div>Collections</div>
          <div className="num-modified push">✎ {counts.modified}</div>
          <div className="num-added">+ {counts.added}</div>
          <div className="num-removed">− {counts.removed}</div>
        </>
      }
    >
      {collections.map((op, i) => (
        <PatchOperation key={`collection-op-${op.op}-${op.path}-${i}`} operation={op} />
      ))}
    </SimpleSection>
  );
};
