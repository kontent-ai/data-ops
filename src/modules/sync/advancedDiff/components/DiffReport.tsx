import type { SyncEntityName } from "../../constants/entities.js";
import type { DiffModel } from "../../types/diffModel.js";
import { diffStyles } from "../styles/diffStyles.js";
import { ComparedEnvironments } from "./ComparedEnvironments.js";
import { AssetFoldersSection } from "./entities/AssetFoldersSection.js";
import { CollectionsSection } from "./entities/CollectionsSection.js";
import { ContentTypesSection } from "./entities/ContentTypesSection.js";
import { LanguagesSection } from "./entities/LanguagesSection.js";
import { SnippetsSection } from "./entities/SnippetsSection.js";
import { SpacesSection } from "./entities/SpacesSection.js";
import { TaxonomiesSection } from "./entities/TaxonomiesSection.js";
import { WebSpotlightSection } from "./entities/WebSpotlightSection.js";
import { WorkflowsSection } from "./entities/WorkflowsSection.js";

type DiffReportProps = Readonly<{
  diffModel: DiffModel;
  sourceEnvId: string;
  targetEnvId: string;
  entities: ReadonlyArray<SyncEntityName>;
  timestamp: string;
  disableLinks?: boolean;
}>;

export const DiffReport = ({
  diffModel,
  sourceEnvId,
  targetEnvId,
  entities,
  timestamp,
  disableLinks = false,
}: DiffReportProps) => (
  <html lang="en">
    <head>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Kontent.ai Environment Comparer</title>
      {/** biome-ignore lint/security/noDangerouslySetInnerHtml: inline css */}
      <style dangerouslySetInnerHTML={{ __html: diffStyles }} />
    </head>
    <body>
      <div id="content-diff" className="content">
        <div className="title">
          <div className="logo">
            <img
              src="https://avatars.githubusercontent.com/u/150392983"
              alt="Kontent.ai"
              title="Kontent.ai"
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>DataOps | diff</div>
          </div>
        </div>
        <h2>Compared environments</h2>
        <ComparedEnvironments
          sourceEnvId={sourceEnvId}
          targetEnvId={targetEnvId}
          disableLinks={disableLinks}
        />
        <div className="diffContainer">
          <h2>Modified entities</h2>
          <div>
            state from <strong>{timestamp}</strong>
          </div>
          {entities.includes("contentTypes") && (
            <ContentTypesSection contentTypes={diffModel.contentTypes} />
          )}
          {entities.includes("contentTypeSnippets") && (
            <SnippetsSection snippets={diffModel.contentTypeSnippets} />
          )}
          {entities.includes("taxonomies") && (
            <TaxonomiesSection taxonomies={diffModel.taxonomyGroups} />
          )}
          {entities.includes("assetFolders") && (
            <AssetFoldersSection assetFolders={diffModel.assetFolders} />
          )}
          {entities.includes("collections") && (
            <CollectionsSection collections={diffModel.collections} />
          )}
          {entities.includes("languages") && <LanguagesSection languages={diffModel.languages} />}
          {entities.includes("webSpotlight") && (
            <WebSpotlightSection webSpotlight={diffModel.webSpotlight} />
          )}
          {entities.includes("spaces") && <SpacesSection spaces={diffModel.spaces} />}
          {entities.includes("workflows") && <WorkflowsSection workflows={diffModel.workflows} />}
        </div>
      </div>
    </body>
  </html>
);
