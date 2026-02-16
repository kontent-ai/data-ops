import { isOp } from "../../../sync/utils.js";
import type { PatchOperation as PatchOperationType } from "../../../types/patchOperation.js";
import { PatchOperation } from "../operations/PatchOperation.js";
import { SimpleSection } from "../SimpleSection.js";

type CollectionsSectionProps = Readonly<{
  collections: ReadonlyArray<PatchOperationType>;
}>;

export const CollectionsSection = ({ collections }: CollectionsSectionProps) => {
  if (collections.length === 0) {
    return <h3>No changes to collections</h3>;
  }

  const addedCount = collections.filter(isOp("addInto")).length;
  const modifiedCount = collections.filter(isOp("replace")).length;
  const removedCount = collections.filter(isOp("remove")).length;

  return (
    <SimpleSection
      id="collections-section"
      header={
        <>
          <div>Collections</div>
          <div className="num-modified push">✎ {modifiedCount}</div>
          <div className="num-added">+ {addedCount}</div>
          <div className="num-removed">− {removedCount}</div>
        </>
      }
    >
      {collections.map((op, i) => (
        <PatchOperation key={`collection-op-${op.op}-${op.path}-${i}`} operation={op} />
      ))}
    </SimpleSection>
  );
};
