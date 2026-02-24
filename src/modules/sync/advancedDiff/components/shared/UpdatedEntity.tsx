import type { PatchOperation } from "../../../types/patchOperation.js";
import { groupEntityWithElements } from "../../utils/groupOperations.js";
import { ArrayChangesSection } from "../operations/ArrayChangesSection.js";
import { ElementNode } from "../operations/ElementNode.js";
import { MoveTable } from "../operations/MoveTable.js";
import { PropertyDiffTable } from "../operations/PropertyDiffTable.js";

type UpdatedEntityProps = Readonly<{
  codename: string;
  operations: ReadonlyArray<PatchOperation>;
}>;

export const UpdatedEntity = ({ codename, operations }: UpdatedEntityProps) => {
  const { entityLevel, elements } = groupEntityWithElements(operations);

  return (
    <details className="entity-detail">
      <summary className="entity-name">{codename}</summary>
      <div className="entity-operations">
        <PropertyDiffTable ops={entityLevel} />
        <ArrayChangesSection adds={entityLevel.adds} removes={entityLevel.removes} />
        <MoveTable moves={entityLevel.moves} />
        {elements.size > 0 && <div className="elements-title">Elements</div>}
        {[...elements.entries()].map(([elementCodename, ops]) => (
          <ElementNode key={elementCodename} codename={elementCodename} ops={ops} />
        ))}
      </div>
    </details>
  );
};
