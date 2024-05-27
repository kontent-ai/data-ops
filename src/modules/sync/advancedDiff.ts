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

export const resolveTemplate = (diffData: DiffData) => {
  const template = readFileSync(resolve("./", "diffTemplate.html"), "utf-8");
  const resolvedTemplate = template.replace(
    /{{.*?}}/g,
    (match) => templateMap.get(match)?.(diffData) ?? match,
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
    logError(diffData, "Failed writing a diff file: ", JSON.stringify(err));
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
      chalk.red("Failed to open the file: "),
      outputPath,
      JSON.stringify(err),
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
        extractEntityIdentifier(
          patchOp.value,
        )
      } to be added ${patchOp.before ? `before ${patchOp.before.codename}` : ""} ${
        patchOp.after ? `after ${patchOp.after.codename}` : ""
      }`;
    case "replace":
      return `Path ${patchOp.path} value replaced.\n - From: "${
        extractEntityIdentifier(
          patchOp.oldValue,
        )
      }" \n - To: ${extractEntityIdentifier(patchOp.value)}`;
  }
};

const processAddedEntities = <T>(entity: T): string => {
  if (isTaxonomyRequestModel(entity)) {
    return `<pre><h2>${entity.name}</h2><h4>${entity.terms.map(e => e.name).join(", ")}</h4></pre>`;
  } else if (isContentTypeData(entity)) {
    return `<pre><h2>${entity.name}</h2><h4>${
      entity.elements.flatMap(e => `${e.codename}: ${e.type}`).join(", ")
    }</h4></pre>`;
  } else if (isContentTypeSnippetData(entity)) {
    return `<pre><h2>${entity.name}</h2><h4>${
      entity.elements.flatMap(e => `${e.codename}: ${e.type}`).join(", ")
    }</h4></pre>`;
  } else {
    return `Unknown type`;
  }
};

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
      ([k, v]) =>
        `<pre><h2>${k}</h2><pre>${
          v
            .flatMap(processPatchOp)
            .join("\n")
        }</pre></pre>`,
    )
    .join("\n");

const templateMap: Map<string, (diff: DiffData) => string> = new Map([
  [
    "{{added_content_types}}",
    (diffData: DiffData) => createEntitiesToAdd(diffData.contentTypes),
  ],
  [
    "{{removed_content_types}}",
    (diffData: DiffData) => createEntitiesToDelete(diffData.contentTypes),
  ],
  [
    "{{modified_content_types}}",
    (diffData: DiffData) => createEntitiesToUpdate(diffData.contentTypes),
  ],
  [
    "{{added_content_type_snippets}}",
    (diffData: DiffData) => createEntitiesToAdd(diffData.contentTypeSnippets),
  ],
  [
    "{{removed_content_type_snippets}}",
    (diffData: DiffData) => createEntitiesToDelete(diffData.contentTypeSnippets),
  ],
  [
    "{{modified_content_type_snippets}}",
    (diffData: DiffData) => createEntitiesToUpdate(diffData.contentTypeSnippets),
  ],
  [
    "{{added_taxonomy_groups}}",
    (diffData: DiffData) => createEntitiesToAdd(diffData.taxonomyGroups),
  ],
  [
    "{{removed_taxonomy_groups}}",
    (diffData: DiffData) => createEntitiesToDelete(diffData.taxonomyGroups),
  ],
  [
    "{{modified_taxonomy_groups}}",
    (diffData: DiffData) => createEntitiesToUpdate(diffData.taxonomyGroups),
  ],
  [
    "{{num_types_to_add}}",
    (diffData: DiffData) => diffData.contentTypes.added.length.toString(),
  ],
  [
    "{{num_types_to_remove}}",
    (diffData: DiffData) => diffData.contentTypes.deleted.size.toString(),
  ],
  [
    "{{num_types_to_mod}}",
    (diffData: DiffData) => diffData.contentTypes.updated.size.toString(),
  ],
  [
    "{{num_snippets_to_add}}",
    (diffData: DiffData) => diffData.contentTypeSnippets.added.length.toString(),
  ],
  [
    "{{num_snippets_to_remove}}",
    (diffData: DiffData) => diffData.contentTypeSnippets.deleted.size.toString(),
  ],
  [
    "{{num_snippets_to_mod}}",
    (diffData: DiffData) => diffData.contentTypeSnippets.updated.size.toString(),
  ],
  [
    "{{num_taxonomy_to_add}}",
    (diffData: DiffData) => diffData.taxonomyGroups.added.length.toString(),
  ],
  [
    "{{num_taxonomy_to_remove}}",
    (diffData: DiffData) => diffData.taxonomyGroups.deleted.size.toString(),
  ],
  [
    "{{num_taxonomy_to_mod}}",
    (diffData: DiffData) => diffData.taxonomyGroups.updated.size.toString(),
  ],
  [
    "{{total_changes}}",
    (diffModel: DiffModel) =>
      Object.values(diffModel)
        .filter(d => "added" in d)
        .reduce<number>(
          (acc, curr) => acc + curr.added.length + curr.deleted.size + curr.updated.size,
          0,
        )
        .toString(),
  ],
  [
    "{{source_env_id}}",
    (syncParams: SyncParams) => syncParams.sourceEnvironmentId ?? "N/A (Sourced from a folder)",
  ],
  ["{{target_env_id}}", (syncParams: SyncParams) => syncParams.environmentId],
]);
