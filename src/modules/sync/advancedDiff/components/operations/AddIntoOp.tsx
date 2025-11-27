import type { ReactNode } from "react";

import type { AddIntoPatchOperation } from "../../../types/patchOperation.js";
import {
  addEntityPathRenderers,
  getEntityPathRenderer,
  modifierIcons,
} from "../../utils/pathRenderers.js";
import { getValueOrIdentifier } from "../../utils/valueHelpers.js";

type AddIntoOpProps = Readonly<{
  op: AddIntoPatchOperation;
}>;

const renderPosition = (op: AddIntoPatchOperation): ReactNode =>
  op.after ? (
    <>
      after <strong>{op.after.codename}</strong>
    </>
  ) : op.before ? (
    <>
      before <strong>{op.before.codename}</strong>
    </>
  ) : null;

export const AddIntoOp = ({ op }: AddIntoOpProps) => {
  const pathElement = getEntityPathRenderer(addEntityPathRenderers, op.path);
  const valueElement = getValueOrIdentifier(op.value);
  const positionElement = renderPosition(op);

  return (
    <div className="op">
      {modifierIcons.addInto}
      {pathElement} {valueElement} added
      {positionElement}
    </div>
  );
};
