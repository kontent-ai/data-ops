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
    diffData.outPath!,
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
      `Failed to open the file: ${outputPath}\nMessage: ${JSON.stringify(err)}`,
    )
  );
};

const processPatchOp = (patchOp: PatchOperation) => {
  switch (patchOp.op) {
    case "remove":
      return `${getEntityDetailFromPath(patchOp.path)} will be removed.`;
    case "move":
      return `Path ${patchOp.path} object to be moved ${
        "before" in patchOp
          ? `before ${patchOp.before.codename}`
          : `after ${patchOp.after.codename}`
      }`;
    case "addInto":
      return `${getEntityDetailFromPath(patchOp.path)} ${
        getValueOrIdentifier(
          patchOp.value,
        )
      } to be added ${patchOp.before ? `before ${patchOp.before.codename}` : ""} ${
        patchOp.after ? `after ${patchOp.after.codename}` : ""
      }`;
    case "replace":
      return `${getEntityDetailFromPath(patchOp.path)} replaced.\n From: ${
        getValueOrIdentifier(
          patchOp.oldValue,
        )
      } \n To: ${getValueOrIdentifier(patchOp.value)}`;
  }
};

const getEntityDetailFromPath = (path: string) => {
  const patterns = [
    {
      regex: /^\/name$/,
      entity: () => `Content type name`,
    },
    { 
      regex: /^\/elements$/,
      entity: () => `Element`,
    },
    { 
      regex: /^\/content_groups$/,
      entity: () => `Content group`,
    },
    {
      regex: /^\/elements\/codename:([^/]+)$/,
      entity: (match: string[]) => `Element <strong>${match[1]}</strong>`,
    },
    {
      regex: /^\/elements\/codename:([^/]+)\/allowed_content_types\/codename:([^/]+)$/,
      entity: (match: string[]) =>
        `Allowed content type <strong>${match[2]}</strong> from element <strong>${match[1]}</strong>"`,
    },
    {
      regex: /^\/elements\/codename:([^/]+)\/allowed_element\/codename:([^/]+)$/,
      entity: (match: string[]) => `Allowed element <strong>${match[2]}</strong> from custom element <strong>${match[1]}</strong>`,
    },
    {
      regex:
        /^\/elements\/codename:([^/]+)\/options\/codename:([^/]+)$/,
      entity: (match: string[]) =>
        `Option <strong>${match[2]}</strong> from multiple choice element <strong>${match[1]}</strong>`,
    },
    {
      regex:
        /^\/content_groups\/codename:([^/]+)$/,
      entity: (match: string[]) =>
        `Content group <strong>${match[1]}</strong>`,
    },
    {
      regex: /^\/elements\/codename:([^/]+)\/allowed_blocks\/([^/]+)$/,
      entity: (match: string[]) =>
        `Allowed block <strong>${match[2]}</strong> from rich text element <strong>${match[1]}</strong>`,
    },
    {
      regex: /^\/elements\/codename:([^/]+)\/allowed_blocks$/,
      entity: (match: string[]) =>
        `Allowed for rich text element <strong>${match[1]}</strong>`,
    },
    {
      regex: /^\/elements\/codename:([^/]+)\/allowed_content_types$/,
      entity: (match: string[]) =>
        `Allowed content types for element <strong>${match[1]}</strong>`,
    },
    {
      regex: /^\/elements\/codename:([^/]+)\/content_group$/,
      entity: (match: string[]) =>
        `Content group for element <strong>${match[1]}</strong>`,
    },
    {
      regex: /^\/elements\/codename:([^/]+)\/guidelines$/,
      entity: (match: string[]) =>
        `Guidelines for element <strong>${match[1]}</strong>`,
    },
  ];

  const pattern = patterns.find((p) => p.regex.test(path));
  return pattern
    ? pattern.entity(path.match(pattern.regex) as string[])
    : `Object at path ${path}`;
};

const processAddedEntities = (entity: unknown): string => {
  if (isTaxonomyRequestModel(entity)) {
    return `<div class="entityDetail" onClick="toggleVisibility('${entity.codename}')"><h4>${entity.codename}</h4><pre style="display: none" id=${entity.codename}>${
      entity.terms
        .map((e) => `<div>${e.name}</div>`)
        .join("\n")
    }</pre></div>`;
  }

  if (isContentTypeData(entity)) {
    return `<div class="entityDetail" onClick="toggleVisibility('${entity.codename}')"><h4>${entity.codename}</h4><pre style="display: none" id=${entity.codename}>${
      entity.elements
        .flatMap((e) => `<div>${e.codename}: ${e.type}</div>`)
        .join("\n")
    }</pre></div>`;
  }

  if (isContentTypeSnippetData(entity)) {
    return `<div class="entityDetail" onClick="toggleVisibility('${entity.codename}')"><h4>${entity.codename}</h4><pre style="display: none" id=${entity.codename}>${
      entity.elements
        .flatMap((e) => `<div>${e.codename}: ${e.type}</div>`)
        .join("\n")
    }</pre></div>`;
  }

  return `<pre>Unknown entity</pre>`;
};

const getValueOrIdentifier = (value: unknown): string | string[] =>
  Array.isArray(value)
    ? value.flatMap(getValueOrIdentifier)
    : typeof value === "object"
        && value
        && (("codename" in value && typeof value.codename === "string")
          || ("id" in value && typeof value.id === "string"))
    ? `<strong>${"codename" in value ? value.codename : value.id}</strong>`
    : `<strong>${value}</strong>`;

const createAddedEntitiesSection = <T extends { codename: string }>(
  diff: Pick<DiffObject<RequiredCodename<T>>, "added">,
) => diff.added.map(processAddedEntities).join("\n");

const createDeletedEntitiesSection = <T extends { codename: string }>(
  diff: Pick<DiffObject<RequiredCodename<T>>, "deleted">,
) => `${[...diff.deleted].map((d) => `<div class="entityDetail"><h4>${d}</h4></div>`).join("\n")}`;

const createUpdatedEntitiesSection = <T extends { codename: string }>(
  diff: Pick<DiffObject<RequiredCodename<T>>, "updated">,
) =>
  [...diff.updated]
    .flatMap(
      ([entity, patchOps]) =>
        `<div class="entityDetail" onClick="toggleVisibility('${entity}')"><h4>${entity}</h4><pre style="display: none" id="${entity}">${
          patchOps
            .flatMap(processPatchOp)
            .join("\n")
        }</pre></div>`,
    )
    .join("\n");

const templateHandlerMap: Map<string, (diff: DiffData) => string> = new Map([
  [
    "{{added_content_types}}",
    ({ contentTypes }: DiffData) => createAddedEntitiesSection(contentTypes),
  ],
  [
    "{{removed_content_types}}",
    ({ contentTypes }: DiffData) => createDeletedEntitiesSection(contentTypes),
  ],
  [
    "{{modified_content_types}}",
    ({ contentTypes }: DiffData) => createUpdatedEntitiesSection(contentTypes),
  ],
  [
    "{{added_content_type_snippets}}",
    ({ contentTypeSnippets }: DiffData) => createAddedEntitiesSection(contentTypeSnippets),
  ],
  [
    "{{removed_content_type_snippets}}",
    ({ contentTypeSnippets }: DiffData) => createDeletedEntitiesSection(contentTypeSnippets),
  ],
  [
    "{{modified_content_type_snippets}}",
    ({ contentTypeSnippets }: DiffData) => createUpdatedEntitiesSection(contentTypeSnippets),
  ],
  [
    "{{added_taxonomy_groups}}",
    ({ taxonomyGroups }: DiffData) => createAddedEntitiesSection(taxonomyGroups),
  ],
  [
    "{{removed_taxonomy_groups}}",
    ({ taxonomyGroups }: DiffData) => createDeletedEntitiesSection(taxonomyGroups),
  ],
  [
    "{{modified_taxonomy_groups}}",
    ({ taxonomyGroups }: DiffData) => createUpdatedEntitiesSection(taxonomyGroups),
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
          (acc, { added, deleted, updated }) => acc + added.length + deleted.size + updated.size,
          0,
        )
        .toString(),
  ],
  [
    "{{source_env_id}}",
    ({ sourceEnvironmentId }: DiffData) => sourceEnvironmentId ?? "N/A (Sourced from a folder)",
  ],
  ["{{target_env_id}}", ({ environmentId }: DiffData) => environmentId],
  ["{{datetime_generated}}", () => new Date().toUTCString()]
]);
