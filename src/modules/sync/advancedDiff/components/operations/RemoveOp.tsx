import type { RemovePatchOperation } from "../../../types/patchOperation.js";
import {
  modifierIcons,
  removeEntityPathRenderers,
  renderEntityPath,
} from "../../utils/pathRenderers.js";

type RemoveOpProps = Readonly<{
  op: RemovePatchOperation;
}>;

export const RemoveOp = ({ op }: RemoveOpProps) => {
  const pathElement = renderEntityPath(removeEntityPathRenderers, op.path);

  return (
    <div className="op">
      {modifierIcons.remove}
      {pathElement} removed
    </div>
  );
};
