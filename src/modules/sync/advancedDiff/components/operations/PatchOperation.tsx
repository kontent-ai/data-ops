import { match } from "ts-pattern";

import type { PatchOperation as PatchOperationType } from "../../../types/patchOperation.js";
import { AddIntoOp } from "./AddIntoOp.js";
import { MoveOp } from "./MoveOp.js";
import { RemoveOp } from "./RemoveOp.js";
import { ReplaceOp } from "./ReplaceOp.js";

type PatchOperationProps = Readonly<{
  operation: PatchOperationType;
}>;

export const PatchOperation = ({ operation }: PatchOperationProps) =>
  match(operation)
    .with({ op: "addInto" }, (op) => <AddIntoOp op={op} />)
    .with({ op: "move" }, (op) => <MoveOp op={op} />)
    .with({ op: "remove" }, (op) => <RemoveOp op={op} />)
    .with({ op: "replace" }, (op) => <ReplaceOp op={op} />)
    .exhaustive();
