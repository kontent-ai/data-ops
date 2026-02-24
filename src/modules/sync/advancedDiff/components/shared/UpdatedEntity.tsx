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
      {operations.map((op, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a stable unique identifier would be too complex
        <PatchOperation key={i} operation={op} />
      ))}
    </div>
  </details>
);
