import type { ReplacePatchOperation } from "../../../types/patchOperation.js";
import {
  modifierIcons,
  renderEntityPath,
  replaceEntityPathRenderers,
} from "../../utils/pathRenderers.js";
import { ComparedElements } from "../shared/ComparedElements.js";

type ReplaceOpProps = Readonly<{
  op: ReplacePatchOperation;
}>;

export const ReplaceOp = ({ op }: ReplaceOpProps) => {
  const pathElement = renderEntityPath(replaceEntityPathRenderers, op.path);

  return (
    <div className="op">
      {modifierIcons.replace}
      {pathElement} changed
      <ComparedElements oldValue={op.oldValue} newValue={op.value} />
    </div>
  );
};
