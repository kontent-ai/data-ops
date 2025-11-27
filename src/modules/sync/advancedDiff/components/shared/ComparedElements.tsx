import { renderReplaceOpValue } from "../../utils/valueHelpers.js";

type ComparedElementsProps = Readonly<{
  oldValue: unknown;
  newValue: unknown;
}>;

export const ComparedElements = ({ oldValue, newValue }: ComparedElementsProps) => {
  const renderedOldValue = renderReplaceOpValue(oldValue);
  const renderedNewValue = renderReplaceOpValue(newValue);

  return (
    <div className="compared-elements">
      <div className="element">{renderedOldValue}</div>
      <div className="comparator">→</div>
      <div className="element">{renderedNewValue}</div>
    </div>
  );
};
