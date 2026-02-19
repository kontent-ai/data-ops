import type { PatchOperation } from "../../../types/patchOperation.js";
import { groupOperations } from "../../utils/groupOperations.js";
import { ArrayChangesSection } from "../operations/ArrayChangesSection.js";
import { ElementNode } from "../operations/ElementNode.js";
import { MoveTable } from "../operations/MoveTable.js";
import { PropertyDiffTable } from "../operations/PropertyDiffTable.js";

type UpdatedEntityProps = Readonly<{
  codename: string;
  operations: ReadonlyArray<PatchOperation>;
}>;

export const UpdatedEntity = ({ codename, operations }: UpdatedEntityProps) => {
  const grouped = groupOperations(operations);

  return (
    <details className="entity-detail">
      <summary className="entity-name">{codename}</summary>
      <div className="entity-operations">
        <PropertyDiffTable ops={grouped.entityLevel} />
        <ArrayChangesSection adds={grouped.entityLevel.adds} removes={grouped.entityLevel.removes} />
        <MoveTable moves={grouped.entityLevel.moves} />
        {grouped.elements.size > 0 && <div className="elements-title">Elements</div>}
        {[...grouped.elements.entries()].map(([elementCodename, ops]) => (
          <ElementNode key={elementCodename} codename={elementCodename} ops={ops} />
        ))}
      </div>
    </details>
  );
};
