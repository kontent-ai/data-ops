import { match } from "ts-pattern";

import type { WebSpotlightDiffModel } from "../../../types/diffModel.js";

type WebSpotlightSectionProps = Readonly<{
  webSpotlight: WebSpotlightDiffModel;
}>;

export const WebSpotlightSection = ({ webSpotlight }: WebSpotlightSectionProps) =>
  match(webSpotlight)
    .with({ change: "none" }, () => <h3>No changes to web spotlight.</h3>)
    .with({ change: "activate" }, (ws) => (
      <details className="entity-section">
        <summary className="entity-section-header">
          <div>Web Spotlight</div>
        </summary>
        <div id="web-spotlight" className="entity-section-content">
          <div className="added">
            <h3>Activate web spotlight with root type: {ws.rootTypeCodename}</h3>
          </div>
        </div>
      </details>
    ))
    .with({ change: "changeRootType" }, (ws) => (
      <details className="entity-section">
        <summary className="entity-section-header">
          <div>Web Spotlight</div>
        </summary>
        <div id="web-spotlight" className="entity-section-content">
          <div className="updated">
            <h3>Change web spotlight root type to: {ws.rootTypeCodename}</h3>
          </div>
        </div>
      </details>
    ))
    .with({ change: "deactivate" }, () => (
      <details className="entity-section">
        <summary className="entity-section-header">
          <div>Web Spotlight</div>
        </summary>
        <div id="web-spotlight" className="entity-section-content">
          <div className="deleted">
            <h3>Deactivate web spotlight.</h3>
          </div>
        </div>
      </details>
    ))
    .exhaustive();
