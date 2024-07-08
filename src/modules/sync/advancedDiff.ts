import {
  ContentTypeElements,
  ContentTypeModels,
  ContentTypeSnippetModels,
  TaxonomyModels,
} from "@kontent-ai/management-sdk";
import chalk from "chalk";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import open from "open";
import { dirname, resolve } from "path";

import { DiffParams } from "../../commands/diff/diff.js";
import { logError, logInfo, LogOptions } from "../../log.js";
import {
  isCountLimitation,
  isDefaultValue,
  isDependsOn,
  isExternalIdReference,
  isExternalIdReferenceArray,
  isMaximumTextLength,
  isObjectReference,
  isObjectReferenceArray,
  isValidationRegex,
} from "../../utils/typeguards.js";
import { RequiredCodename } from "../../utils/types.js";
import { DiffModel, DiffObject } from "./types/diffModel.js";
import {
  AddIntoPatchOperation,
  MovePatchOperation,
  PatchOperation,
  RemovePatchOperation,
  ReplacePatchOperation,
  ReplacePatchOperationValue,
} from "./types/patchOperation.js";

type DiffData = DiffModel & Omit<DiffParams, "targetApiKey" | "sourceApiKey">;
type EntityPathRenderer = {
  regex: RegExp;
  render: (() => string) | ((match: string[]) => string);
};
type Operation = PatchOperation["op"];
type TypeOrSnippet = ContentTypeModels.IAddContentTypeData | ContentTypeSnippetModels.IAddContentTypeSnippetData;
type ElementOrTerm = ContentTypeElements.Element | TaxonomyModels.IAddTaxonomyRequestModel;
type RenderFunction<T extends PatchOperation> = (patchOp: T) => string;
type EntityType = "taxonomies" | "types" | "snippets";
type EntityActionType = "added" | "updated" | "deleted";

// for testing purposes, mocked date passed to spawned process in runCommand()
const myDate = process.env.MOCKED_DATE ? new Date(process.env.MOCKED_DATE) : new Date();
const dateGenerated = myDate.toUTCString();

export const generateDiff = (diffData: DiffData) => {
  const logOptions: LogOptions = diffData;
  const resolvedPath = resolveOutputPath(diffData.outPath!);
  const resolvedTemplate = resolveHtmlTemplate("./diffTemplate.html", diffData);
  const outputDir = dirname(resolvedPath);

  if (!existsSync(outputDir)) {
    createOutputDirectory(outputDir, logOptions);
  }

  createOutputFile(resolvedPath, resolvedTemplate, logOptions);

  if (!diffData.noOpen) {
    openOutputFile(resolvedPath, logOptions);
  }
};

const resolveHtmlTemplate = (
  templatePath: string,
  diffData: DiffData,
): string => {
  const template = readFileSync(resolve(templatePath), "utf-8");
  const resolvePlaceHolders = (template: string): string => {
    const processedTemplate = template.replace(
      /{{.*?}}/g,
      match => rendererMap.get(match)?.(diffData) ?? match,
    );

    return processedTemplate === template
      ? template
      : resolvePlaceHolders(processedTemplate);
  };

  return resolvePlaceHolders(template);
};

const resolveOutputPath = (outputPath: string) => {
  const hasExtension = !!resolve(outputPath).split("/").pop()?.includes(".");

  return hasExtension
    ? resolve(outputPath)
    : resolve(
      outputPath,
      `diff_${new Date().toISOString().replace(/[:.-]/g, "_")}.html`,
    );
};

const createOutputFile = (path: string, content: string, logOptions: LogOptions) => {
  try {
    logInfo(
      logOptions,
      "standard",
      chalk.yellow(`Generating a diff file at ${path}`),
    );
    writeFileSync(path, content);
  } catch (err) {
    logError(logOptions, `Failed writing a diff file: ${JSON.stringify(err)}`);
    process.exit(1);
  }
};

const openOutputFile = (path: string, logOptions: LogOptions) => {
  logInfo(
    logOptions,
    "standard",
    chalk.green(`Diff file created successfully. Opening...`),
  );
  open(path).catch((err) =>
    logError(
      logOptions,
      `Failed to open the file: ${path}\nMessage: ${JSON.stringify(err)}`,
    )
  );
};

const createOutputDirectory = (path: string, logOptions: LogOptions) => {
  try {
    logInfo(
      logOptions,
      "standard",
      chalk.yellow(`Creating a directory '${path}'`),
    );
    mkdirSync(path, { recursive: true });
  } catch (err) {
    logError(logOptions, `Failed to create directory '${path}': ${JSON.stringify(err)}`);
    process.exit(1);
  }
};

const renderMoveOpPosition = (patchOp: MovePatchOperation) =>
  "after" in patchOp
    ? `after <strong>${patchOp.after.codename}</strong>`
    : "before" in patchOp
    ? `before <strong>${patchOp.before.codename}</strong>`
    : `under <strong>${patchOp.under.codename}</strong>`;

const renderAddIntoOpPosition = (patchOp: AddIntoPatchOperation) =>
  patchOp.after
    ? `after <strong>${[patchOp.after.codename]}</strong>`
    : patchOp.before
    ? `before <strong>${[patchOp.before.codename]}</strong>`
    : "";

const renderRemoveOpDetail = (patchOp: RemovePatchOperation) =>
  `${modifierMap.get("remove")}${
    getEntityPathRenderer(
      removeEntityPathRenderers,
      patchOp.path,
    )
  } removed`;

const renderMoveOpDetail = (patchOp: MovePatchOperation) =>
  `${modifierMap.get("move")}${
    getEntityPathRenderer(
      moveEntityPathRenderers,
      patchOp.path,
    )
  } moved ${renderMoveOpPosition(patchOp)}`;

const renderAddIntoOpDetail = (patchOp: AddIntoPatchOperation) =>
  `${modifierMap.get("addInto")}${
    getEntityPathRenderer(
      addEntityPathRenderers,
      patchOp.path,
    )
  } ${getValueOrIdentifier(patchOp.value)} added ${renderAddIntoOpPosition(patchOp)}`;

const renderReplaceOpDetail = (patchOp: ReplacePatchOperation) =>
  `${modifierMap.get("replace")}${
    getEntityPathRenderer(
      replaceEntityPathRenderers,
      patchOp.path,
    )
  } changed ${renderReplaceOpDifference(patchOp)}`;

const renderReplaceOpDifference = (patchOp: ReplacePatchOperation) =>
  `<div class="compared-elements"><div class="element">${
    renderReplaceOpValue(
      patchOp.oldValue,
    )
  }</div><div class="comparator">→</div><div class="element"> ${
    renderReplaceOpValue(
      patchOp.value,
    )
  }</div></div>`;

const createRenderOp = <T extends PatchOperation>(pathRenderer: RenderFunction<T>): RenderFunction<T> => (patchOp: T) =>
  `<div class="op">${pathRenderer(patchOp)}</div>`;

const renderPatchOp = (patchOp: PatchOperation) => patchOpRendererMap.get(patchOp.op)?.(patchOp);

const getEntityPathRenderer = (renderers: ReadonlyArray<EntityPathRenderer>, path: string) => {
  const renderer = renderers.find((h) => h.regex.test(path));
  if (!renderer) {
    return `Object at path ${path}`;
  }

  const match = path.match(renderer.regex);

  return match ? renderer.render(match) : renderer.render([]);
};

const renderTaxonomyPath = (pathSegments: string[]) => {
  const extractedTerms = pathSegments.map((s) => s.split(":")[1]);
  extractedTerms.push(`<strong>${extractedTerms.pop()}</strong>`);

  return `<span>${extractedTerms.join(" » ")} term</span>`;
};

const renderAddedElement = (element: ContentTypeElements.Element) =>
  `<div class="added-element"><div class="element" onClick="toggleVisibility('${element.codename}')">${element.codename}<div id=${element.codename} style="display: none">${
    renderAddedElementProperties(element)
  }</div></div><div class="element-type">${
    element.type
      .toUpperCase()
      .replace("_", " ")
  }
  </div></div>`;

const renderAddedElementProperties = (element: ContentTypeElements.Element) =>
  Object.entries(element)
    .map(renderAddedElementProperty)
    .join("\n");

const renderAddedElementProperty = ([property, value]: [string, unknown]) => {
  // property keys where empty array means all related values are allowed
  // TODO: add docs issue to explicitly state this for linked items element as well
  const emptyAllowsAll: ReadonlyArray<string> = [
    "allowed_content_types",
    "allowed_item_link_types",
    "allowed_blocks",
    "allowed_text_blocks",
    "allowed_formatting",
    "allowed_table_blocks",
    "allowed_table_text_blocks",
    "allowed_table_formatting",
  ];

  const allowsAll = emptyAllowsAll.includes(property) && Array.isArray(value) && value.length === 0;

  return `<div>${property}: ${allowsAll ? "<strong>all</strong>" : getValueOrIdentifier(value)}</div>`;
};

const renderAddedTaxonomyTerm = (
  taxonomy: TaxonomyModels.IAddTaxonomyRequestModel,
) => `<div class="element">${taxonomy.name}</div>`;

const createRenderAddedEntityData =
  <U extends ElementOrTerm>(entityElementRenderer: (element: U) => string) =>
  <T extends { codename: string }>(entity: T, entityElements: U[]) =>
    `<div class="entity-detail"><div class="entity-name" onClick="toggleVisibility('${entity.codename}')">${entity.codename}</div><div style="display: none" id=${entity.codename}>${
      entityElements.map(entityElementRenderer).join("\n")
    }</div></div>`;

const renderAddedTaxonomyData = createRenderAddedEntityData(renderAddedTaxonomyTerm);
const renderAddedTypeOrSnippetData = createRenderAddedEntityData(renderAddedElement);

/**
 * Retrieves relevant value/identifier from various properties and objects.
 * Useful when iterating over properties.
 *
 * @param value property of unknown type
 * @returns suitable value or identifier in string format for rendering
 */
const getValueOrIdentifier = (value: unknown): string | string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(getValueOrIdentifier);
  }

  if (typeof value === "object" && value !== null) {
    const valueObj = value as Record<string, unknown>;

    if (typeof valueObj.codename === "string") {
      return `<strong>${valueObj.codename}</strong>`;
    }

    if (typeof valueObj.id === "string") {
      return `<strong>${valueObj.id}</strong>`;
    }

    if ("value" in valueObj) {
      return getValueOrIdentifier(valueObj.value);
    }

    if ("global" in valueObj) {
      return getValueOrIdentifier(valueObj.global);
    }

    if (typeof valueObj.regex === "string") {
      return `<strong>${valueObj.regex}</strong>`;
    }
  }

  return `<strong>${String(value)}</strong>`;
};

const renderReplaceOpValue = (
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
        return value.map((r) => r.codename).join(", ");
      }
      if (isExternalIdReference(value)) {
        return value.external_id;
      }
      if (isExternalIdReferenceArray(value)) {
        return value.map((r) => r.external_id).join(", ");
      }
      if (isDependsOn(value)) {
        return `${value.element.codename} ${value.snippet?.codename ? "of snippet " + value.snippet.codename : ""}`;
      }
      if (isDefaultValue(value)) {
        return renderReplaceOpValue(value.global.value);
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
      return getValueOrIdentifier(value);
    default:
      return value as any;
  }
};

const renderDeletedEntity = (entityCodename: string) =>
  `<div class="entity-detail"><div class="entity-name removed">${entityCodename}</div></div>`;

const renderAddedTypesOrSnippetsSectionData = <T extends RequiredCodename<TypeOrSnippet>>(
  diff: Pick<DiffObject<RequiredCodename<T>>, "added">,
) => diff.added.map(a => renderAddedTypeOrSnippetData(a, a.elements)).join("\n");

const renderAddedTaxonomiesSectionData = <T extends TaxonomyModels.IAddTaxonomyRequestModel>(
  diff: Pick<DiffObject<RequiredCodename<T>>, "added">,
) => diff.added.map(a => renderAddedTaxonomyData(a, a.terms)).join("\n");

const renderDeletedEntitiesSectionData = <T extends { codename: string }>(
  diff: Pick<DiffObject<RequiredCodename<T>>, "deleted">,
) =>
  `${
    [...diff.deleted]
      .map(renderDeletedEntity)
      .join("\n")
  }`;

const renderUpdatedEntitiesSectionData = <T extends { codename: string }>(
  diff: Pick<DiffObject<RequiredCodename<T>>, "updated">,
) =>
  [...diff.updated]
    .filter(([, p]) => p.length > 0)
    .flatMap(renderUpdatedEntity)
    .join("\n");

const renderUpdatedEntity = (
  [entityCodename, patchOps]: [string, Readonly<PatchOperation[]>],
) =>
  `<div class="entity-detail"><div class="entity-name" onClick="toggleVisibility('${entityCodename}')">${entityCodename}</div><div class="entity-operations" style="display: none" id="${entityCodename}">${
    patchOps
      .flatMap(renderPatchOp)
      .join("\n")
  }</div></div>`;

const renderEntitySection = (
  entityType: EntityType,
  changes: DiffObject<unknown>,
) => {
  const { added, updated, deleted } = changes;
  const entityTypeNameMap: ReadonlyMap<typeof entityType, string> = new Map([
    ["snippets", "Snippets"],
    ["taxonomies", "Taxonomy groups"],
    ["types", "Content types"],
  ]);

  return `
      <div class="entity-section">
        <div class="entity-section-header" onclick="toggleVisibility('${entityType}')">
            <div>${entityTypeNameMap.get(entityType)}</div>
            <div class="num-modified push">✎ {{num_${entityType}_updated}}</div>
            <div class="num-added">+ {{num_${entityType}_added}}</div>
            <div class="num-removed">− {{num_${entityType}_removed}}</div>
        </div>
        <div id="${entityType}" class="entity-section-content">
            ${
    [...updated.values()].filter(v => v.length).length
      ? renderUpdatedEntitySection(entityType)
      : ""
  }
            <div class="added-and-deleted">
                ${deleted.size ? renderRemovedEntitySection(entityType) : ""}
                ${added.length ? renderAddedEntitySection(entityType) : ""}
            </div>
        </div>
      </div>
    `;
};

const createRenderEntitySection = (entityActionType: EntityActionType) => (entityType: EntityType) => `
  <div class="${entityActionType}">
    <h3>${entityActionType}</h3>
    {{${entityActionType}_${entityType}}}
  </div>
`;

const renderAddedEntitySection = createRenderEntitySection("added");
const renderUpdatedEntitySection = createRenderEntitySection("updated");
const renderRemovedEntitySection = createRenderEntitySection("deleted");

const getCombinedOpLength = (ops: DiffObject<unknown>) =>
  [
    ...ops.added,
    ...ops.deleted,
    ...[...ops.updated.values()].filter(v => v.length),
  ].length;

const rendererMap: ReadonlyMap<string, (data: DiffData) => string> = new Map([
  [
    "{{added_types}}",
    ({ contentTypes }: DiffData) => renderAddedTypesOrSnippetsSectionData(contentTypes),
  ],
  [
    "{{deleted_types}}",
    ({ contentTypes }: DiffData) => renderDeletedEntitiesSectionData(contentTypes),
  ],
  [
    "{{updated_types}}",
    ({ contentTypes }: DiffData) => renderUpdatedEntitiesSectionData(contentTypes),
  ],
  [
    "{{added_snippets}}",
    ({ contentTypeSnippets }: DiffData) => renderAddedTypesOrSnippetsSectionData(contentTypeSnippets),
  ],
  [
    "{{deleted_snippets}}",
    ({ contentTypeSnippets }: DiffData) => renderDeletedEntitiesSectionData(contentTypeSnippets),
  ],
  [
    "{{updated_snippets}}",
    ({ contentTypeSnippets }: DiffData) => renderUpdatedEntitiesSectionData(contentTypeSnippets),
  ],
  [
    "{{added_taxonomies}}",
    ({ taxonomyGroups }: DiffData) => renderAddedTaxonomiesSectionData(taxonomyGroups),
  ],
  [
    "{{deleted_taxonomies}}",
    ({ taxonomyGroups }: DiffData) => renderDeletedEntitiesSectionData(taxonomyGroups),
  ],
  [
    "{{updated_taxonomies}}",
    ({ taxonomyGroups }: DiffData) => renderUpdatedEntitiesSectionData(taxonomyGroups),
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
    ({ contentTypes }: DiffData) =>
      [...contentTypes.updated]
        .filter(([, v]) => v.length > 0)
        .length.toString(),
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
      [...contentTypeSnippets.updated]
        .filter(([, v]) => v.length > 0)
        .length.toString(),
  ],
  [
    "{{num_taxonomies_added}}",
    ({ taxonomyGroups }: DiffData) => taxonomyGroups.added.length.toString(),
  ],
  [
    "{{num_taxonomies_removed}}",
    ({ taxonomyGroups }: DiffData) => taxonomyGroups.deleted.size.toString(),
  ],
  [
    "{{num_taxonomies_updated}}",
    ({ taxonomyGroups }: DiffData) =>
      [...taxonomyGroups.updated]
        .filter(([, v]) => v.length > 0)
        .length.toString(),
  ],
  [
    "{{source_env_id}}",
    ({ sourceEnvironmentId, folderName }: DiffData) => sourceEnvironmentId ?? folderName!,
  ],
  [
    "{{target_env_id}}",
    ({ targetEnvironmentId }: DiffData) => targetEnvironmentId,
  ],
  ["{{datetime_generated}}", () => dateGenerated],
  [
    "{{env_link_disabler}}",
    ({ folderName }: DiffData) => (folderName ? "disabled" : ""),
  ],
  [
    "{{types_section}}",
    ({ contentTypes }: DiffData) =>
      getCombinedOpLength(contentTypes)
        ? renderEntitySection("types", contentTypes)
        : "<h3>No changes to taxonomy groups.</h3>",
  ],
  [
    "{{snippets_section}}",
    ({ contentTypeSnippets }: DiffData) =>
      getCombinedOpLength(contentTypeSnippets)
        ? renderEntitySection("snippets", contentTypeSnippets)
        : "<h3>No changes to snippets.</h3>",
  ],
  [
    "{{taxonomies_section}}",
    ({ taxonomyGroups }: DiffData) =>
      getCombinedOpLength(taxonomyGroups)
        ? renderEntitySection("taxonomies", taxonomyGroups)
        : "<h3>No changes to taxonomy groups.</h3>",
  ],
]);

const patchOpRendererMap: ReadonlyMap<
  Operation,
  RenderFunction<PatchOperation>
> = new Map<Operation, RenderFunction<any>>([
  ["addInto", createRenderOp(renderAddIntoOpDetail)],
  ["move", createRenderOp(renderMoveOpDetail)],
  ["remove", createRenderOp(renderRemoveOpDetail)],
  ["replace", createRenderOp(renderReplaceOpDetail)],
]);

const modifierMap: ReadonlyMap<Operation, string> = new Map([
  ["addInto", `<span class="num-added modifier-icon">+</span>`],
  ["move", `<span class="num-modified modifier-icon">⤷</span>`],
  ["remove", `<span class="num-removed modifier-icon">−</span>`],
  ["replace", `<span class="num-modified modifier-icon">⇄</span>`],
]);

const replaceEntityPathRenderers: ReadonlyArray<EntityPathRenderer> = [
  {
    regex: /^\/name$/,
    render: () => `Content type name`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/([^/]+)$/,
    render: (match: string[]) => `Property <strong>${match[2]}</strong> of element <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/content_groups\/codename:([^/]+)\/name$/,
    render: (match: string[]) => `Content group <strong>${match[1]}</strong> name`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/options\/codename:([^/]+)\/([^/]+)$/,
    render: (match: string[]) =>
      `Property <strong>${match[3]}</strong> of multiple choice option <strong>${
        match[2]
      }</strong> on element <strong>${match[1]}</strong>`,
  },
  {
    regex: /\/terms\/codename:([^/]+)/g,
    render: (matches: string[]) => renderTaxonomyPath(matches),
  },
];

const addEntityPathRenderers: ReadonlyArray<EntityPathRenderer> = [
  {
    regex: /^\/elements$/,
    render: () => `Element`,
  },
  {
    regex: /^\/content_groups$/,
    render: () => `Content group`,
  },
  {
    regex: /^\/terms$/,
    render: () => `Top level term`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_content_types$/,
    render: (match: string[]) => `For element <strong>${match[1]}</strong>, allowed content type`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_elements$/,
    render: (match: string[]) => `For custom element <strong>${match[1]}</strong>, allowed element`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/options$/,
    render: (match: string[]) => `For multiple choice element <strong>${match[1]}</strong>, option`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_blocks$/,
    render: (match: string[]) => `For rich text element <strong>${match[1]}</strong>, allowed block`,
  },
  {
    regex: /\/terms\/codename:([^/]+)/g,
    render: (matches: string[]) => renderTaxonomyPath(matches),
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_formatting$/,
    render: (match: string[]) => `For rich text element <strong>${match[1]}</strong>, allowed formatting`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_text_blocks$/,
    render: (match: string[]) => `For rich text element <strong>${match[1]}</strong>, allowed text block`,
  },
];

const removeEntityPathRenderers: ReadonlyArray<EntityPathRenderer> = [
  {
    regex: /^\/elements\/codename:([^/]+)$/,
    render: (match: string[]) => `Element <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/content_groups\/codename:([^/]+)$/,
    render: (match: string[]) => `Content group <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_content_types\/codename:([^/]+)$/,
    render: (match: string[]) =>
      `Allowed content type <strong>${match[2]}</strong> for element <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_elements\/codename:([^/]+)$/,
    render: (match: string[]) =>
      `Allowed element <strong>${match[2]}</strong> for custom element <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/options\/codename:([^/]+)$/,
    render: (match: string[]) =>
      `Option <strong>${match[2]}</strong> for multiple choice element <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_table_formatting\/([^/]+)$/,
    render: (match: string[]) =>
      `Allowed table formatting <strong>${match[2]}</strong> for rich text element <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_formatting\/([^/]+)$/,
    render: (match: string[]) =>
      `Allowed formatting <strong>${match[2]}</strong> for rich text element <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_text_blocks\/([^/]+)$/,
    render: (match: string[]) =>
      `Allowed formatting <strong>${match[2]}</strong> for rich text element <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_table_text_blocks\/([^/]+)$/,
    render: (match: string[]) =>
      `Allowed table text block <strong>${match[2]}</strong> for rich text element <strong>${match[1]}</strong>`,
  },
  {
    regex: /\/terms\/codename:([^/]+)/g,
    render: (matches: string[]) => renderTaxonomyPath(matches),
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_blocks\/([^/]+)$/,
    render: (match: string[]) =>
      `Allowed block <strong>${match[2]}</strong> for rich text element <strong>${match[1]}</strong>`,
  },
];

const moveEntityPathRenderers: ReadonlyArray<EntityPathRenderer> = [
  {
    regex: /^\/elements\/codename:([^/]+)$/,
    render: (match: string[]) => `Element <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/options\/codename:([^/]+)$/,
    render: (match: string[]) =>
      `Option <strong>${match[2]}</strong> for multiple choice element <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/content_groups\/codename:([^/]+)$/,
    render: (match: string[]) => `Content group <strong>${match[1]}</strong>`,
  },
  {
    regex: /\/terms\/codename:([^/]+)/g,
    render: (matches: string[]) => renderTaxonomyPath(matches),
  },
];
