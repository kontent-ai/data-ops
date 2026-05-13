import { match } from "ts-pattern";

import type { LivePreviewDiffModel } from "../../../types/diffModel.js";
import { SimpleSection } from "../SimpleSection.js";

type LivePreviewSectionProps = Readonly<{
  livePreview: LivePreviewDiffModel;
}>;

const getChangeInfo = (lp: LivePreviewDiffModel) =>
  match(lp)
    .with({ change: "update" }, (w) => ({
      className: "updated",
      message: `Set live preview status to: ${w.status}`,
    }))
    .with({ change: "none" }, () => null)
    .exhaustive();

export const LivePreviewSection = ({ livePreview }: LivePreviewSectionProps) => {
  const change = getChangeInfo(livePreview);

  if (!change) {
    return (
      <SimpleSection id="live-preview" header={<div>Live Preview</div>}>
        <p>No changes to live preview.</p>
      </SimpleSection>
    );
  }

  return (
    <SimpleSection id="live-preview" header={<div>Live Preview</div>}>
      <div className={change.className}>
        <h3>{change.message}</h3>
      </div>
    </SimpleSection>
  );
};
