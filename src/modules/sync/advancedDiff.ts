import { ContentTypeElements } from "@kontent-ai/management-sdk";
import chalk from "chalk";
import { readFileSync, writeFileSync } from "fs";
import open from "open";
import { resolve } from "path";

import { SyncParams } from "../../commands/diff/diff.js";
import { logError, logInfo } from "../../log.js";
import {
  isContentTypeData,
  isContentTypeSnippetData,
  isCountLimitation,
  isDefaultValue,
  isDependsOn,
  isExternalIdReference,
  isExternalIdReferenceArray,
  isMaximumTextLength,
  isObjectReference,
  isObjectReferenceArray,
  isTaxonomyRequestModel,
  isValidationRegex,
} from "../../utils/typeguards.js";
import { RequiredCodename } from "../../utils/types.js";
import { DiffModel, DiffObject } from "./types/diffModel.js";
import { PatchOperation, ReplacePatchOperationValue } from "./types/patchOperation.js";

type DiffData = DiffModel & SyncParams;
type EntityPathHandler = {
  regex: RegExp;
  entity: (() => string) | ((match: string[]) => string);
};

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
      return `${getRemoveEntityDetail(patchOp.path)} removed`;
    case "move": {
      const beforeText = "before" in patchOp
        ? `before <strong>${patchOp.before.codename}</strong>`
        : "";
      const afterText = "after" in patchOp
        ? `after <strong>${patchOp.after.codename}</strong>`
        : "";
      return `${
        getMoveEntityDetail(
          patchOp.path,
        )
      } moved ${beforeText}${afterText}`;
    }
    case "addInto":
      return `${getAddEntityDetail(patchOp.path)} ${
        getValueOrIdentifier(
          patchOp.value,
        )
      } added ${patchOp.before ? `before ${patchOp.before.codename}` : ""}${
        patchOp.after ? `after ${patchOp.after.codename}` : ""
      }`;
    case "replace":
      return `${
        getReplaceEntityDetail(
          patchOp.path,
        )
      } changed <div class="compared-elements"><div class="compared-element">${
        getReplaceOpValue(
          patchOp.oldValue,
        )
      }</div><div class="comparator">→</div><div class="compared-element"> ${
        getReplaceOpValue(
          patchOp.value,
        )
      }</div></div>`;
  }
};

const getEntityPathHandler = (handlers: EntityPathHandler[], path: string) => {
  const pattern = handlers.find(h => h.regex.test(path));

  return pattern
    ? pattern.entity(path.match(pattern.regex) as string[])
    : `Object at path ${path}`;
};

const getAddEntityDetail = (path: string) => getEntityPathHandler(addEntityPathHandlers, path);
const getRemoveEntityDetail = (path: string) => getEntityPathHandler(removeEntityPathHandlers, path);
const getReplaceEntityDetail = (path: string) => getEntityPathHandler(replaceEntityPathHandlers, path);
const getMoveEntityDetail = (path: string) => getEntityPathHandler(moveEntityPathHandlers, path);

const replaceEntityPathHandlers: EntityPathHandler[] = [
  {
    regex: /^\/name$/,
    entity: () => `<span class="num_modified modifier-icon">⇄</span> Content type name`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/([^/]+)$/,
    entity: (match: string[]) =>
      `<span class="num_modified modifier-icon">⇄</span> Property <strong>${match[2]}</strong> of element <strong>${
        match[1]
      }</strong>`,
  },
  {
    regex: /^\/content_groups\/codename:([^/]+)\/name$/,
    entity: (match: string[]) =>
      `<span class="num_modified modifier-icon">⇄</span> Content group <strong>${match[1]}</strong> name`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/options\/codename:([^/]+)\/([^/]+)$/,
    entity: (match: string[]) =>
      `<span class="num_modified modifier-icon">⇄</span> Property <strong>${
        match[3]
      }</strong> of multiple choice option <strong>${match[2]}</strong> on element <strong>${match[1]}</strong>`,
  },
  {
    regex: /\/terms\/codename:([^/]+)/g,
    entity: (matches: string[]) => matches.map((m) => `${m.split(":")[1]} ›`).join(" ").slice(0, -1) + "term",
  },
];

const addEntityPathHandlers: EntityPathHandler[] = [
  {
    regex: /^\/elements$/,
    entity: () => `<span class="num_added modifier-icon">+</span> Element`,
  },
  {
    regex: /^\/content_groups$/,
    entity: () => `<span class="num_added modifier-icon">+</span> Content group`,
  },
  {
    regex: /^\/terms$/,
    entity: () => `<span class="num_added modifier-icon">+</span> Term`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_content_types$/,
    entity: (match: string[]) =>
      `<span class="num_added modifier-icon">+</span> For element <strong>${match[1]}</strong>, allowed content type`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_elements$/,
    entity: (match: string[]) =>
      `<span class="num_added modifier-icon">+</span> For custom element <strong>${match[1]}</strong>, allowed element`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/options$/,
    entity: (match: string[]) =>
      `<span class="num_added modifier-icon">+</span> For multiple choice element <strong>${match[1]}</strong>, option`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_blocks$/,
    entity: (match: string[]) =>
      `<span class="num_added modifier-icon">+</span> For rich text element <strong>${
        match[1]
      }</strong>, allowed block`,
  },
  {
    regex: /\/terms\/codename:([^/]+)/g,
    entity: (matches: string[]) => matches.map((m) => `${m.split(":")[1]} ›`).join(" ").slice(0, -1) + "term",
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_formatting$/,
    entity: (match: string[]) =>
      `<span class="num_added modifier-icon">+</span> For rich text element <strong>${
        match[1]
      }</strong>, allowed formatting`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_text_blocks$/,
    entity: (match: string[]) =>
      `<span class="num_added modifier-icon">+</span> For rich text element <strong>${
        match[1]
      }</strong>, allowed text block`,
  },
];

const removeEntityPathHandlers: EntityPathHandler[] = [
  {
    regex: /^\/elements\/codename:([^/]+)$/,
    entity: (match: string[]) =>
      `<span class="num_removed modifier-icon">−</span> Element <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/content_groups\/codename:([^/]+)$/,
    entity: (match: string[]) =>
      `<span class="num_removed modifier-icon">−</span> Content group <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_content_types\/codename:([^/]+)$/,
    entity: (match: string[]) =>
      `<span class="num_removed modifier-icon">−</span> Allowed content type <strong>${
        match[2]
      }</strong> for element <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_elements\/codename:([^/]+)$/,
    entity: (match: string[]) =>
      `<span class="num_removed modifier-icon">−</span> Allowed element <strong>${
        match[2]
      }</strong> for custom element <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/options\/codename:([^/]+)$/,
    entity: (match: string[]) =>
      `<span class="num_removed modifier-icon">−</span> Option <strong>${
        match[2]
      }</strong> for multiple choice element <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_table_formatting\/([^/]+)$/,
    entity: (match: string[]) =>
      `<span class="num_removed modifier-icon">−</span> Allowed table formatting <strong>${
        match[2]
      }</strong> for rich text element <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_formatting\/([^/]+)$/,
    entity: (match: string[]) =>
      `<span class="num_removed modifier-icon">−</span> Allowed formatting <strong>${
        match[2]
      }</strong> for rich text element <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_text_blocks\/([^/]+)$/,
    entity: (match: string[]) =>
      `<span class="num_removed modifier-icon">−</span> Allowed formatting <strong>${
        match[2]
      }</strong> for rich text element <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_table_text_blocks\/([^/]+)$/,
    entity: (match: string[]) =>
      `<span class="num_removed modifier-icon">−</span> Allowed table text block <strong>${
        match[2]
      }</strong> for rich text element <strong>${match[1]}</strong>`,
  },
  {
    regex: /\/terms\/codename:([^/]+)/g,
    entity: (matches: string[]) => matches.map((m) => `− ${m.split(":")[1]} ›`).join(" ").slice(0, -1) + "term",
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_blocks\/([^/]+)$/,
    entity: (match: string[]) =>
      `<span class="num_removed modifier-icon">−</span> Allowed block <strong>${
        match[2]
      }</strong> for rich text element <strong>${match[1]}</strong>`,
  },
];

const moveEntityPathHandlers: EntityPathHandler[] = [
  {
    regex: /^\/elements\/codename:([^/]+)$/,
    entity: (match: string[]) =>
      `<span class="num_modified modifier-icon">⤷</span> Element <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/options\/codename:([^/]+)$/,
    entity: (match: string[]) =>
      `<span class="num_modified modifier-icon">⤷</span> Option <strong>${
        match[2]
      }</strong> for multiple choice element <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/content_groups\/codename:([^/]+)$/,
    entity: (match: string[]) =>
      `<span class="num_modified modifier-icon">⤷</span> Content group <strong>${match[1]}</strong>`,
  },
  {
    regex: /\/terms\/codename:([^/]+)/g,
    entity: (matches: string[]) => processTaxonomyPath(matches),
  },
];

const processTaxonomyPath = (pathSegments: string[]) => {
  const changedSegment = `<strong>${pathSegments.pop()}</strong>`;
  pathSegments.push(changedSegment);
  return pathSegments.map((m) => `➦ ${m.split(":")[1]} ›`).join(" ").slice(0, -1) + "term";
};

const createAddedElementEntry = (element: ContentTypeElements.Element) =>
  `<div class="added-elements"><div class="compared-element">${element.codename}</div><div class="element-type">${
    element.type.toUpperCase().replace("_", " ")
  }</div></div>`;

const processAddedEntities = (entity: unknown): string => {
  if (isTaxonomyRequestModel(entity)) {
    return `<div class="entityDetail"><div class="entity-name" onClick="toggleVisibility('${entity.codename}')">${entity.codename}</div><div style="display: none" id=${entity.codename}>${
      entity.terms
        .map((e) => `<div>${e.name}</div>`)
        .join("\n")
    }</div></div>`;
  }

  if (isContentTypeData(entity)) {
    return `<div class="entityDetail"><div class="entity-name" onClick="toggleVisibility('${entity.codename}')">${entity.codename}</div><div style="display: none" id=${entity.codename}>${
      entity.elements.map(createAddedElementEntry).join("\n")
    }</div></div>`;
  }

  if (isContentTypeSnippetData(entity)) {
    return `<div class="entityDetail"><div class="entity-name" onClick="toggleVisibility('${entity.codename}')">${entity.codename}</div><div style="display: none" id=${entity.codename}>${
      entity.elements.map(createAddedElementEntry).join("\n")
    }</div></div>`;
  }

  return `<pre>Unknown entity</pre>`;
};

const getValueOrIdentifier = (value: unknown): string | string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(getValueOrIdentifier);
  } else if (typeof value === "object" && value !== null) {
    if (
      ("codename" in value && typeof value.codename === "string")
      || ("id" in value && typeof value.id === "string")
    ) {
      return `<strong>${"codename" in value ? value.codename : value.id}</strong>`;
    } else if ("value" in value && typeof value.value === "number") {
      return `<strong>${value.value}</strong>`;
    }
  }
  return `<strong>${value}</strong>`;
};

const getReplaceOpValue = (
  value: unknown,
): ReplacePatchOperationValue | null => {
  switch (typeof value) {
    case "string":
    case "boolean":
    case "number":
      return value;
    case "object":
      if (isCountLimitation(value)) {
        return `${value.condition}: ${value.value}`;
      }
      if (isObjectReference(value)) {
        return value.codename;
      }
      if (isObjectReferenceArray(value)) {
        return value.map(r => r.codename).join(", ");
      }
      if (isExternalIdReference(value)) {
        return value.external_id;
      }
      if (isExternalIdReferenceArray(value)) {
        return value.map(r => r.external_id).join(", ");
      }
      if (isDependsOn(value)) {
        return `${value.element.codename} ${value.snippet?.codename ? "of snippet " + value.snippet.codename : ""}`;
      }
      if (isDefaultValue(value)) {
        return getReplaceOpValue(value.global.value);
      }
      if (isMaximumTextLength(value)) {
        return `${value.value} ${value.applies_to}`;
      }
      if (isValidationRegex(value)) {
        return `<p><strong>Regex:</strong> ${value.regex}<strong></p><p>Flags:</strong> ${
          value.flags ?? "—"
        }</p><p><strong>IsActive:</strong> ${value.is_active ?? "—"}</p><p><strong>Validation message:</strong> ${
          value.validation_message ?? "—"
        }</p>`;
      }
      return value as any;
    default:
      return value as any;
  }
};

const createAddedEntitiesSection = <T extends { codename: string }>(
  diff: Pick<DiffObject<RequiredCodename<T>>, "added">,
) => diff.added.map(processAddedEntities).join("\n");

const createDeletedEntitiesSection = <T extends { codename: string }>(
  diff: Pick<DiffObject<RequiredCodename<T>>, "deleted">,
) =>
  `${
    [...diff.deleted]
      .map((d) =>
        `<div class="entityDetail"><div class="entity-name removed" onClick="toggleVisibility('${d}')">${d}</div></div>`
      )
      .join("\n")
  }`;

const createUpdatedEntitiesSection = <T extends { codename: string }>(
  diff: Pick<DiffObject<RequiredCodename<T>>, "updated">,
) =>
  [...diff.updated]
    .filter(([, p]) => p.length > 0)
    .flatMap(
      ([entity, patchOps]) =>
        `<div class="entityDetail"><div class="entity-name" onClick="toggleVisibility('${entity}')">${entity}</div><div class="entity-operations" style="display: none" id="${entity}">${
          patchOps
            .flatMap(op => `<div class="op">${processPatchOp(op)}</div>`)
            .join("\n")
        }</div></div>`,
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
    "{{num_types_added}}",
    ({ contentTypes }: DiffData) => contentTypes.added.length.toString(),
  ],
  [
    "{{num_types_removed}}",
    ({ contentTypes }: DiffData) => contentTypes.deleted.size.toString(),
  ],
  [
    "{{num_types_updated}}",
    ({ contentTypes }: DiffData) => [...contentTypes.updated].filter(([, v]) => v.length > 0).length.toString(),
  ],
  [
    "{{num_snippets_added}}",
    ({ contentTypeSnippets }: DiffData) => contentTypeSnippets.added.length.toString(),
  ],
  [
    "{{num_snippets_removed}}",
    ({ contentTypeSnippets }: DiffData) => contentTypeSnippets.deleted.size.toString(),
  ],
  [
    "{{num_snippets_updated}}",
    ({ contentTypeSnippets }: DiffData) =>
      [...contentTypeSnippets.updated].filter(([, v]) => v.length > 0).length.toString(),
  ],
  [
    "{{num_taxonomy_added}}",
    ({ taxonomyGroups }: DiffData) => taxonomyGroups.added.length.toString(),
  ],
  [
    "{{num_taxonomy_removed}}",
    ({ taxonomyGroups }: DiffData) => taxonomyGroups.deleted.size.toString(),
  ],
  [
    "{{num_taxonomy_updated}}",
    ({ taxonomyGroups }: DiffData) => [...taxonomyGroups.updated].filter(([, v]) => v.length > 0).length.toString(),
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
    ({ sourceEnvironmentId, folderName }: DiffData) => sourceEnvironmentId ?? folderName!,
  ],
  ["{{target_env_id}}", ({ targetEnvironmentId }: DiffData) => targetEnvironmentId],
  ["{{datetime_generated}}", () => new Date().toUTCString()],
  ["{{env_link_disabler}}", ({ folderName }: DiffData) => folderName ? "disabled" : ""],
  [
    "{{hide_empty_updated_snippets}}",
    ({ contentTypeSnippets }: DiffData) =>
      [...contentTypeSnippets.updated].filter(([, v]) => v.length > 0).length === 0 ? "hidden" : "",
  ],
]);
