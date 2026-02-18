import type { PatchOperation as PatchOperationType } from "../../../types/patchOperation.js";
import { PatchOperation } from "../operations/PatchOperation.js";

type UpdatedEntityProps = Readonly<{
  codename: string;
  operations: ReadonlyArray<PatchOperationType>;
}>;

export const UpdatedEntity = ({ codename, operations }: UpdatedEntityProps) => (
  <details className="entity-detail">
    <summary className="entity-name">{codename}</summary>
    <div className="entity-operations">
      {operations.map((op) => (
        <PatchOperation key={`${codename}-op-${op.op}-${op.path}`} operation={op} />
      ))}
    </div>
  </details>
);
