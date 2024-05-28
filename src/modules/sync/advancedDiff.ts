import chalk from "chalk";
import { readFileSync, writeFileSync } from "fs";
import open from "open";
import { resolve } from "path";

import { SyncParams } from "../../commands/diff.js";
import { logError, logInfo } from "../../log.js";
import { isContentTypeData, isContentTypeSnippetData, isTaxonomyRequestModel } from "../../utils/typeguards.js";
import { RequiredCodename } from "../../utils/types.js";
import { DiffModel, DiffObject, PatchOperation } from "./types/diffModel.js";

type DiffData = DiffModel & SyncParams;

export const writeDiffToFile = (diffData: DiffData) => {
  const template = readFileSync(resolve("./", "diffTemplate.html"), "utf-8");
  const resolvedTemplate = template.replace(
    /{{.*?}}/g,
    (match) => templateHandlerMap.get(match)?.(diffData) ?? match,
  );
  const outputPath = resolve(
    "./",
    `diff_${new Date().toISOString().replace(/[:.-]/g, "_")}.html`,
  );

  try {
    logInfo(
      diffData,
      "standard",
      chalk.yellow(`Generating a diff file at ${outputPath}`),
    );
    writeFileSync(outputPath, resolvedTemplate);
  } catch (err) {
    logError(diffData, `Failed writing a diff file: ${JSON.stringify(err)}`);
    process.exit(1);
  }

  logInfo(
    diffData,
    "standard",
    chalk.green(`Diff file created successfully. Opening...`),
  );
  open(outputPath).catch((err) =>
    logError(
      diffData,
      `Failed to open the file: ${outputPath}\nMessage: ${JSON.stringify(err)}`
    )
  );
};

const processPatchOp = (patchOp: PatchOperation) => {
  const extractEntityIdentifier = (value: unknown): string | string[] =>
    Array.isArray(value)
      ? value.flatMap(extractEntityIdentifier)
      : typeof value === "object"
          && value
          && (("codename" in value && typeof value.codename === "string")
            || ("id" in value && typeof value.id === "string"))
      ? `"${"codename" in value ? value.codename : value.id}"`
      : `${value}`;

  switch (patchOp.op) {
    case "remove":
      return `Path ${patchOp.path} object to be removed.`;
    case "move":
      return `Path ${patchOp.path} object to be moved ${
        "before" in patchOp
          ? `before ${patchOp.before.codename}`
          : `after ${patchOp.after.codename}`
      }`;
    case "addInto":
      return `Path ${patchOp.path} with ${
        getValueOrIdentifier(
          patchOp.value,
        )
      } to be added ${patchOp.before ? `before ${patchOp.before.codename}` : ""} ${
        patchOp.after ? `after ${patchOp.after.codename}` : ""
      }`;
    case "replace":
      return `Path ${patchOp.path} value replaced.\n - From: "${
        getValueOrIdentifier(
          patchOp.oldValue,
        )
      }" \n - To: ${getValueOrIdentifier(patchOp.value)}`;
  }
};

const processAddedEntities = (entity: unknown): string => {
  if (isTaxonomyRequestModel(entity)) {
    return `<pre><h2>${entity.name}</h2><h4>${entity.terms
      .map((e) => e.name)
      .join(", ")}</h4></pre>`;
  }

  if (isContentTypeData(entity)) {
    return `<pre><h2>${entity.name}</h2><h4>${entity.elements
      .flatMap((e) => `${e.codename}: ${e.type}`)
      .join(", ")}</h4></pre>`;
  }
  if (isContentTypeSnippetData(entity)) {
    return `<pre><h2>${entity.name}</h2><h4>${entity.elements
      .flatMap((e) => `${e.codename}: ${e.type}`)
      .join(", ")}</h4></pre>`;
  }
  return `Unknown type`;
};

const getValueOrIdentifier = (value: unknown): string | string[] =>
  Array.isArray(value)
    ? value.flatMap(getValueOrIdentifier)
    : typeof value === "object"
        && value
        && (("codename" in value && typeof value.codename === "string")
          || ("id" in value && typeof value.id === "string"))
    ? `"${"codename" in value ? value.codename : value.id}"`
    : `${value}`;

const createEntitiesToAdd = <T extends { codename: string }>(
  diff: Pick<DiffObject<RequiredCodename<T>>, "added">,
) => diff.added.map(processAddedEntities).join("\n");

const createEntitiesToDelete = <T extends { codename: string }>(
  diff: Pick<DiffObject<RequiredCodename<T>>, "deleted">,
) => `<pre><h2>${[...diff.deleted].map((d) => d).join(", ")}</h2></pre>`;

const createEntitiesToUpdate = <T extends { codename: string }>(
  diff: Pick<DiffObject<RequiredCodename<T>>, "updated">,
) =>
  [...diff.updated]
    .flatMap(
      ([entity, patchOps]) =>
        `<pre><h2>${entity}</h2><pre>${
          patchOps
            .flatMap(processPatchOp)
            .join("\n")
        }</pre></pre>`,
    )
    .join("\n");

const templateHandlerMap: Map<string, (diff: DiffData) => string> = new Map([
  [
    "{{added_content_types}}",
    ({ contentTypes }: DiffData) => createEntitiesToAdd(contentTypes),
  ],
  [
    "{{removed_content_types}}",
    ({ contentTypes }: DiffData) => createEntitiesToDelete(contentTypes),
  ],
  [
    "{{modified_content_types}}",
    ({ contentTypes }: DiffData) => createEntitiesToUpdate(contentTypes),
  ],
  [
    "{{added_content_type_snippets}}",
    ({ contentTypeSnippets }: DiffData) => createEntitiesToAdd(contentTypeSnippets),
  ],
  [
    "{{removed_content_type_snippets}}",
    ({ contentTypeSnippets }: DiffData) => createEntitiesToDelete(contentTypeSnippets),
  ],
  [
    "{{modified_content_type_snippets}}",
    ({ contentTypeSnippets }: DiffData) => createEntitiesToUpdate(contentTypeSnippets),
  ],
  [
    "{{added_taxonomy_groups}}",
    ({ taxonomyGroups }: DiffData) => createEntitiesToAdd(taxonomyGroups),
  ],
  [
    "{{removed_taxonomy_groups}}",
    ({ taxonomyGroups }: DiffData) => createEntitiesToDelete(taxonomyGroups),
  ],
  [
    "{{modified_taxonomy_groups}}",
    ({ taxonomyGroups }: DiffData) => createEntitiesToUpdate(taxonomyGroups),
  ],
  [
    "{{num_types_to_add}}",
    ({ contentTypes }: DiffData) => contentTypes.added.length.toString(),
  ],
  [
    "{{num_types_to_remove}}",
    ({ contentTypes }: DiffData) => contentTypes.deleted.size.toString(),
  ],
  [
    "{{num_types_to_mod}}",
    ({ contentTypes }: DiffData) => contentTypes.updated.size.toString(),
  ],
  [
    "{{num_snippets_to_add}}",
    ({ contentTypeSnippets }: DiffData) => contentTypeSnippets.added.length.toString(),
  ],
  [
    "{{num_snippets_to_remove}}",
    ({ contentTypeSnippets }: DiffData) => contentTypeSnippets.deleted.size.toString(),
  ],
  [
    "{{num_snippets_to_mod}}",
    ({ contentTypeSnippets }: DiffData) => contentTypeSnippets.updated.size.toString(),
  ],
  [
    "{{num_taxonomy_to_add}}",
    ({ taxonomyGroups }: DiffData) => taxonomyGroups.added.length.toString(),
  ],
  [
    "{{num_taxonomy_to_remove}}",
    ({ taxonomyGroups }: DiffData) => taxonomyGroups.deleted.size.toString(),
  ],
  [
    "{{num_taxonomy_to_mod}}",
    ({ taxonomyGroups }: DiffData) => taxonomyGroups.updated.size.toString(),
  ],
  [
    "{{total_changes}}",
    ({ taxonomyGroups, contentTypes, contentTypeSnippets }: DiffData) =>
      [taxonomyGroups, contentTypes, contentTypeSnippets]
        .reduce(
          (acc, {added, deleted, updated}) => acc + added.length + deleted.size + updated.size,
          0,
        )
        .toString(),
  ],
  [
    "{{source_env_id}}",
    ({ sourceEnvironmentId }: DiffData) => sourceEnvironmentId ?? "N/A (Sourced from a folder)",
  ],
  ["{{target_env_id}}", ({ environmentId }: DiffData) => environmentId],
]);
