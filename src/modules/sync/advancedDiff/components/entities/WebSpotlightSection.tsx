import { match } from "ts-pattern";

import type { WebSpotlightDiffModel } from "../../../types/diffModel.js";
import { SimpleSection } from "../SimpleSection.js";

type WebSpotlightSectionProps = Readonly<{
  webSpotlight: WebSpotlightDiffModel;
}>;

const getChangeInfo = (ws: WebSpotlightDiffModel) =>
  match(ws)
    .with({ change: "activate" }, (w) => ({
      className: "added",
      message: `Activate web spotlight with root type: ${w.rootTypeCodename}`,
    }))
    .with({ change: "changeRootType" }, (w) => ({
      className: "updated",
      message: `Change web spotlight root type to: ${w.rootTypeCodename}`,
    }))
    .with({ change: "deactivate" }, () => ({
      className: "deleted",
      message: "Deactivate web spotlight.",
    }))
    .with({ change: "none" }, () => null)
    .exhaustive();

export const WebSpotlightSection = ({ webSpotlight }: WebSpotlightSectionProps) => {
  const change = getChangeInfo(webSpotlight);

  if (!change) {
    return (
      <SimpleSection id="web-spotlight" header={<div>Web Spotlight</div>}>
        <p>No changes to web spotlight.</p>
      </SimpleSection>
    );
  }

  return (
    <SimpleSection id="web-spotlight" header={<div>Web Spotlight</div>}>
      <div className={change.className}>
        <h3>{change.message}</h3>
      </div>
    </SimpleSection>
  );
};
