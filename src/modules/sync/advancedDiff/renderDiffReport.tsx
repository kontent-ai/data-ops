import { renderToString } from "react-dom/server";

import type { LogOptions } from "../../../log.js";
import type { SyncEntityName } from "../constants/entities.js";
import type { DiffModel, DiffObject } from "../types/diffModel.js";
import { DiffReport } from "./components/DiffReport.js";

type AdvancedDiffParams = Readonly<{
  targetEnvironmentId: string;
  outPath?: string;
  sourceEnvironmentId?: string;
  folderName?: string;
  entities: ReadonlyArray<SyncEntityName>;
  noOpen?: boolean;
}> &
  LogOptions;

export type DiffData = DiffModel & AdvancedDiffParams;

const sortDiffObject = <T extends { codename: string }, Z extends DiffObject<T>>(
  diffObject: Z,
): Z => ({
  ...diffObject,
  added: diffObject.added.toSorted((a, b) => a.codename.localeCompare(b.codename)),
  updated: new Map(Array.from(diffObject.updated).toSorted((a, b) => a[0].localeCompare(b[0]))),
  deleted: new Set(Array.from(diffObject.deleted).toSorted((a, b) => a.localeCompare(b))),
});

const sortDiffModel = (diffModel: DiffModel): DiffModel => ({
  ...diffModel,
  contentTypes: sortDiffObject(diffModel.contentTypes),
  contentTypeSnippets: sortDiffObject(diffModel.contentTypeSnippets),
  taxonomyGroups: sortDiffObject(diffModel.taxonomyGroups),
  languages: sortDiffObject(diffModel.languages),
  spaces: sortDiffObject(diffModel.spaces),
  workflows: sortDiffObject(diffModel.workflows),
});

export const renderDiffReport = (diffData: DiffData): string => {
  const sortedDiffModel = sortDiffModel(diffData);

  const html = renderToString(
    <DiffReport
      diffModel={sortedDiffModel}
      sourceEnvId={diffData.sourceEnvironmentId ?? diffData.folderName ?? "local folder"}
      targetEnvId={diffData.targetEnvironmentId}
      entities={diffData.entities}
      timestamp={new Date().toISOString()}
      disableLinks={!diffData.sourceEnvironmentId}
    />,
  );

  return `<!DOCTYPE html>${html}`;
};
