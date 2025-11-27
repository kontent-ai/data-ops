import { renderToString } from "react-dom/server";

import type { LogOptions } from "../../../log.js";
import type { SyncEntityName } from "../constants/entities.js";
import type { DiffModel, DiffObject } from "../types/diffModel.js";
import { DiffReport } from "./components/DiffReport.js";

type AdvancedDiffParams = Readonly<{
  targetEnvironmentId: string;
  outPath?: string;
  entities: ReadonlyArray<SyncEntityName>;
  noOpen?: boolean;
}> &
  (
    | Readonly<{ sourceEnvironmentId: string; folderName?: undefined }>
    | Readonly<{ sourceEnvironmentId?: undefined; folderName: string }>
  ) &
  LogOptions;

export type DiffData = Readonly<{
  diffModel: DiffModel;
  params: AdvancedDiffParams;
}>;

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

export const renderDiffReport = ({ diffModel, params }: DiffData): string => {
  const sortedDiffModel = sortDiffModel(diffModel);

  const html = renderToString(
    <DiffReport
      diffModel={sortedDiffModel}
      sourceEnvId={params.sourceEnvironmentId ?? params.folderName}
      targetEnvId={params.targetEnvironmentId}
      entities={params.entities}
      timestamp={new Date().toISOString()}
      disableLinks={!params.sourceEnvironmentId}
    />,
  );

  return `<!DOCTYPE html>${html}`;
};
