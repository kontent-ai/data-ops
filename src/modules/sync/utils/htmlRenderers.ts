import type {
  ContentTypeElements,
  ContentTypeModels,
  ContentTypeSnippetModels,
  LanguageModels,
  TaxonomyModels,
} from "@kontent-ai/management-sdk";
import { match } from "ts-pattern";

import type { LogOptions } from "../../../log.js";
import {
  isCountLimitation,
  isDefaultElementValue,
  isDependsOn,
  isExternalIdReference,
  isExternalIdReferenceArray,
  isMaximumTextLength,
  isObjectReference,
  isObjectReferenceArray,
  isValidationRegex,
} from "../../../utils/typeguards.js";
import type { RequiredCodename } from "../../../utils/types.js";
import type { SyncEntityName } from "../constants/entities.js";
import { isOp } from "../sync/utils.js";
import type { DiffModel, DiffObject } from "../types/diffModel.js";
import type {
  AddIntoPatchOperation,
  MovePatchOperation,
  PatchOperation,
  RemovePatchOperation,
  ReplacePatchOperation,
  ReplacePatchOperationValue,
} from "../types/patchOperation.js";

type EntityPathRenderer = {
  regex: RegExp;
  render: (() => string) | ((match: string[]) => string);
};
type Operation = PatchOperation["op"];
type TypeOrSnippet =
  | ContentTypeModels.IAddContentTypeData
  | ContentTypeSnippetModels.IAddContentTypeSnippetData;
type ElementOrTerm = ContentTypeElements.Element | TaxonomyModels.IAddTaxonomyRequestModel;
type RenderFunction<T extends PatchOperation> = (patchOp: T) => string;
type EntityType =
  | "taxonomies"
  | "types"
  | "snippets"
  | "spaces"
  | "languages"
  | "workflows"
  | "collections"
  | "assetFolders";
type EntityActionType = "added" | "updated" | "deleted";
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

/**
 * Replaces placeholders recursively. Some rendered sections have placeholders of their own,
 * for example entity sections. Multiple runs ensure that only non-empty entities and changes
 * are rendered, hence the recursion.
 *
 * @param templateString loaded HTML template for resolution
 * @param diffData diff data to process for placeholder resolution
 * @returns resolved HTML string
 */
export const resolveHtmlTemplate = (templateString: string, diffData: DiffData): string => {
  const resolvePlaceHolders = (template: string): string => {
    const processedTemplate = template.replace(
      /{{.*?}}/g,
      (match) => rendererMap.get(match)?.(diffData) ?? match,
    );

    return processedTemplate === template ? template : resolvePlaceHolders(processedTemplate);
  };

  return resolvePlaceHolders(templateString);
};

const createRenderAddedEntityData =
  <U extends ElementOrTerm>(entityElementRenderer: (element: U) => string) =>
  <T extends { codename: string }>(entity: T, entityElements: U[]) =>
    `<div class="entity-detail"><div class="entity-name" onClick="toggleVisibility('${entity.codename}')">${entity.codename}</div><div style="display: none" id=${entity.codename}>${entityElements
      .map(entityElementRenderer)
      .join("\n")}</div></div>`;

const createRenderOp =
  <T extends PatchOperation>(pathRenderer: RenderFunction<T>): RenderFunction<T> =>
  (patchOp: T) =>
    `<div class="op">${pathRenderer(patchOp)}</div>`;

const createRenderEntitySection =
  (entityActionType: EntityActionType) => (entityType: EntityType) =>
    `
    <div class="${entityActionType}">
      <h3>${entityActionType}</h3>
      {{${entityActionType}_${entityType}}}
    </div>
  `;

const renderAddedEntitySection = createRenderEntitySection("added");

const renderUpdatedEntitySection = createRenderEntitySection("updated");

const renderRemovedEntitySection = createRenderEntitySection("deleted");

const getEntityPathRenderer = (renderers: ReadonlyArray<EntityPathRenderer>, path: string) => {
  const renderer = renderers.find((h) => h.regex.test(path));
  if (!renderer) {
    return `Object at path ${path}`;
  }

  const match = path.match(renderer.regex);

  return match ? renderer.render(match) : renderer.render([]);
};

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

    if ("step" in valueObj) {
      return getValueOrIdentifier(valueObj.step);
    }

    if ("scope" in valueObj) {
      return getValueOrIdentifier(valueObj.scope);
    }

    if ("content_types" in valueObj && "collections" in valueObj) {
      return `types: ${getValueOrIdentifier(valueObj.content_types)}, collections: ${getValueOrIdentifier(
        valueObj.collections,
      )}`;
    }

    if ("collections" in valueObj) {
      return getValueOrIdentifier(valueObj.collections);
    }
  }

  return `<strong>${String(value)}</strong>`;
};

const renderPatchOp = (patchOp: PatchOperation) => patchOpRendererMap.get(patchOp.op)?.(patchOp);

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
  `${modifierMap.get("remove")}${getEntityPathRenderer(removeEntityPathRenderers, patchOp.path)} removed`;

const renderMoveOpDetail = (patchOp: MovePatchOperation) =>
  `${modifierMap.get("move")}${getEntityPathRenderer(moveEntityPathRenderers, patchOp.path)} moved ${renderMoveOpPosition(
    patchOp,
  )}`;

const renderAddIntoOpDetail = (patchOp: AddIntoPatchOperation) =>
  `${modifierMap.get("addInto")}${getEntityPathRenderer(addEntityPathRenderers, patchOp.path)} ${getValueOrIdentifier(
    patchOp.value,
  )} added ${renderAddIntoOpPosition(patchOp)}`;

const renderReplaceOpDetail = (patchOp: ReplacePatchOperation) =>
  `${modifierMap.get("replace")}${getEntityPathRenderer(replaceEntityPathRenderers, patchOp.path)} changed ${renderReplaceOpDifference(
    patchOp,
  )}`;

const renderReplaceOpDifference = (patchOp: ReplacePatchOperation) =>
  `<div class="compared-elements"><div class="element">${renderReplaceOpValue(
    patchOp.oldValue,
  )}</div><div class="comparator">→</div><div class="element"> ${renderReplaceOpValue(patchOp.value)}</div></div>`;

const renderTaxonomyPath = (pathSegments: ReadonlyArray<string>) => {
  const extractedTerms = pathSegments.map((s) => s.split(":")[1]);
  extractedTerms.push(`<strong>${extractedTerms.pop()}</strong>`);

  return `<span>${extractedTerms.join(" » ")} term</span>`;
};

const renderAddedElement = (element: ContentTypeElements.Element) =>
  `<div class="added-element"><div class="element" onClick="toggleVisibility('${element.codename}')">${element.codename}<div id=${element.codename} style="display: none">${renderAddedObjectProperties(
    element,
  )}</div></div><div class="element-type">${element.type.toUpperCase().replace("_", " ")}
    </div></div>`;

const renderAddedObjectProperties = (object: object) =>
  Object.entries(object).map(renderAddedObjectProperty).join("\n");

const renderAddedObjectProperty = ([property, value]: Readonly<[string, unknown]>) => {
  // property keys where empty array means all related values are allowed
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
  depth = 0,
): string =>
  `<ul class="term">
        <li>${taxonomy.name}
        ${
          depth < 3 && taxonomy.terms.length
            ? `${taxonomy.terms.map((term) => renderAddedTaxonomyTerm(term, depth + 1)).join("\n")}</li>`
            : "</li>"
        }
      </ul>`;

const renderAddedTaxonomyData = createRenderAddedEntityData(renderAddedTaxonomyTerm);

const renderAddedTypeOrSnippetData = createRenderAddedEntityData(renderAddedElement);

const renderReplaceOpValue = (value: unknown): ReplacePatchOperationValue | null => {
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
        return `${value.element.codename} ${value.snippet?.codename ? `of snippet ${value.snippet.codename}` : ""}`;
      }
      if (isDefaultElementValue(value)) {
        return renderReplaceOpValue(value.global.value);
      }
      if (isMaximumTextLength(value)) {
        return `${value.value} ${value.applies_to}`;
      }
      if (isValidationRegex(value)) {
        return `<p><strong>Regex:</strong> ${value.regex}</p><p><strong>Flags:</strong> ${
          value.flags ?? "—"
        }</p><p><strong>IsActive:</strong> ${value.is_active || "—"}</p><p><strong>Validation message:</strong> ${
          value.validation_message ?? "—"
        }</p>`;
      }
      return getValueOrIdentifier(value);
    default:
      return null;
  }
};

const renderDeletedEntity = (entityCodename: string) =>
  `<div class="entity-detail"><div class="entity-name removed">${entityCodename}</div></div>`;

const renderAddedTypesOrSnippetsSectionData = <T extends RequiredCodename<TypeOrSnippet>>(
  diff: Pick<DiffObject<RequiredCodename<T>>, "added">,
) => diff.added.map((a) => renderAddedTypeOrSnippetData(a, a.elements)).join("\n");

const renderAddedTaxonomiesSectionData = <T extends TaxonomyModels.IAddTaxonomyRequestModel>(
  diff: Pick<DiffObject<RequiredCodename<T>>, "added">,
) =>
  `${diff.added.map((a) => renderAddedTaxonomyData(a, a.terms)).join("\n")}<div class="warning">⚠️ Only the first three depth levels shown.</div>`;

const renderAddedLanguagesSectionData = (
  diff: Pick<DiffObject<RequiredCodename<LanguageModels.IAddLanguageData>>, "added">,
) =>
  diff.added
    .map(
      (entity) =>
        `<div class="entity-detail"><div class="entity-name" onClick="toggleVisibility('${entity.codename}')">${entity.codename}</div><div class="entity-operations" style="display: none" id=${entity.codename}>
    ${renderAddedObjectProperties({ ...entity, fallback_language: entity.fallback_language?.codename })}
    </div></div>`,
    )
    .join("\n");

const renderAddedWorkflowsOrSpacesSectionData = (
  diff: Pick<DiffObject<RequiredCodename<LanguageModels.IAddLanguageData>>, "added">,
) =>
  diff.added
    .map(
      (entity) =>
        `<div class="entity-detail"><div class="entity-name" onClick="toggleVisibility('${entity.codename}')">${entity.codename}</div><div class="entity-operations" style="display: none" id=${entity.codename}>
    ${renderAddedObjectProperties(entity)}
    </div></div>`,
    )
    .join("\n");

const renderDeletedEntitiesSectionData = <T extends { codename: string }>(
  diff: Pick<DiffObject<RequiredCodename<T>>, "deleted">,
) => [...diff.deleted].map(renderDeletedEntity).join("\n");

const renderUpdatedEntitiesSectionData = <T extends { codename: string }>(
  diff: Pick<DiffObject<RequiredCodename<T>>, "updated">,
) =>
  [...diff.updated]
    .filter(([, p]) => p.length > 0)
    .flatMap(renderUpdatedEntity)
    .join("\n");

const renderUpdatedEntity = ([entityCodename, patchOps]: Readonly<
  [string, Readonly<PatchOperation[]>]
>) =>
  `<div class="entity-detail"><div class="entity-name" onClick="toggleVisibility('${entityCodename}')">${entityCodename}</div><div class="entity-operations" style="display: none" id="${entityCodename}">${patchOps
    .flatMap(renderPatchOp)
    .join("\n")}</div></div>`;

const renderEntitySection = (
  entityType: EntityType,
  { added, updated, deleted }: DiffObject<unknown>,
) => {
  const entityTypeNameMap: Readonly<Record<EntityType, string>> = {
    snippets: "Snippets",
    taxonomies: "Taxonomy groups",
    types: "Content types",
    spaces: "Spaces",
    languages: "Languages",
    collections: "Collections",
    assetFolders: "Asset folders",
    workflows: "Workflows",
  };

  return renderSection({
    id: entityType,
    header: `
    <div>${entityTypeNameMap[entityType]}</div>
    ${modifiedNum([...updated.values()].filter((ops) => ops.length).length, true)}
    ${addedNum(added.length)}
    ${removedNum(deleted.size)}
    `,
    content: `
    ${
      [...updated.values()].filter((v) => v.length).length
        ? renderUpdatedEntitySection(entityType)
        : ""
    }
    <div class="added-and-deleted">
        ${deleted.size ? renderRemovedEntitySection(entityType) : ""}
        ${added.length ? renderAddedEntitySection(entityType) : ""}
    </div>
    `,
  });
};

const addedNum = (num: number, push = false) =>
  `<div class="num-added ${push ? "push" : ""}">+ ${num}</div>`;

const removedNum = (num: number, push = false) =>
  `<div class="num-removed ${push ? "push" : ""}">− ${num}</div>`;

const modifiedNum = (num: number, push = false) =>
  `<div class="num-modified ${push ? "push" : ""}">✎ ${num}</div>`;

const renderWebSpotlightSection = (webSpotlight: DiffData["webSpotlight"]) => {
  const section = (content: string) =>
    renderSection({ id: "web-spotlight", header: "<div>Web Spotlight</div>", content: content });

  return match(webSpotlight)
    .with({ change: "none" }, () => "<h3>No changes to web spotlight.</h3>")
    .with({ change: "activate" }, (ws) =>
      section(
        `<div class="added"><h3>Activate web spotlight with root type: ${ws.rootTypeCodename}</h3></div>`,
      ),
    )
    .with({ change: "changeRootType" }, (ws) =>
      section(
        `<div class="updated"><h3>Change web spotlight root type to: ${ws.rootTypeCodename}</h3></div>`,
      ),
    )
    .with({ change: "deactivate" }, () =>
      section('<div class="deleted"><h3>Deactivate web spotlight.</h3></div>'),
    )
    .exhaustive();
};

type RenderSectionParams = Readonly<{
  id: string;
  header: string;
  content: string;
}>;

const renderSection = (params: RenderSectionParams) => `
    <div class="entity-section">
      <div class="entity-section-header" onclick="toggleVisibility('${params.id}')">
        ${params.header}
      </div>
      <div id="${params.id}" class="entity-section-content">
        ${params.content}
      </div>
    </div>
`;

const getCombinedOpLength = (ops: DiffObject<unknown>) =>
  ops.added.length + ops.deleted.size + [...ops.updated.values()].filter((v) => v.length).length;

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
    ({ contentTypeSnippets }: DiffData) =>
      renderAddedTypesOrSnippetsSectionData(contentTypeSnippets),
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
  ["{{added_languages}}", ({ languages }: DiffData) => renderAddedLanguagesSectionData(languages)],
  [
    "{{deleted_languages}}",
    ({ languages }: DiffData) => renderDeletedEntitiesSectionData(languages),
  ],
  [
    "{{updated_languages}}",
    ({ languages }: DiffData) => renderUpdatedEntitiesSectionData(languages),
  ],
  [
    "{{added_workflows}}",
    ({ workflows }: DiffData) => renderAddedWorkflowsOrSpacesSectionData(workflows),
  ],
  [
    "{{deleted_workflows}}",
    ({ workflows }: DiffData) => renderDeletedEntitiesSectionData(workflows),
  ],
  [
    "{{updated_workflows}}",
    ({ workflows }: DiffData) => renderUpdatedEntitiesSectionData(workflows),
  ],
  ["{{added_spaces}}", ({ spaces }: DiffData) => renderAddedWorkflowsOrSpacesSectionData(spaces)],
  ["{{deleted_spaces}}", ({ spaces }: DiffData) => renderDeletedEntitiesSectionData(spaces)],
  ["{{updated_spaces}}", ({ spaces }: DiffData) => renderUpdatedEntitiesSectionData(spaces)],
  [
    "{{source_env_id}}",
    ({ sourceEnvironmentId, folderName }: DiffData) => sourceEnvironmentId ?? folderName ?? "",
  ],
  ["{{target_env_id}}", ({ targetEnvironmentId }: DiffData) => targetEnvironmentId],
  ["{{datetime_generated}}", () => new Date().toUTCString()],
  ["{{env_link_disabler}}", ({ folderName }: DiffData) => (folderName ? "disabled" : "")],
  [
    "{{types_section}}",
    ({ contentTypes, entities }: DiffData) =>
      entities.includes("contentTypes")
        ? getCombinedOpLength(contentTypes)
          ? renderEntitySection("types", contentTypes)
          : "<h3>No changes to content types.</h3>"
        : "",
  ],
  [
    "{{snippets_section}}",
    ({ contentTypeSnippets, entities }: DiffData) =>
      entities.includes("contentTypeSnippets")
        ? getCombinedOpLength(contentTypeSnippets)
          ? renderEntitySection("snippets", contentTypeSnippets)
          : "<h3>No changes to snippets.</h3>"
        : " ",
  ],
  [
    "{{taxonomies_section}}",
    ({ taxonomyGroups, entities }: DiffData) =>
      entities.includes("taxonomies")
        ? getCombinedOpLength(taxonomyGroups)
          ? renderEntitySection("taxonomies", taxonomyGroups)
          : "<h3>No changes to taxonomy groups.</h3>"
        : "",
  ],
  [
    "{{web_spotlight_section}}",
    ({ webSpotlight, entities }: DiffData) =>
      entities.includes("webSpotlight") ? renderWebSpotlightSection(webSpotlight) : "",
  ],
  [
    "{{asset_folders_section}}",
    ({ assetFolders, entities }: DiffData) =>
      entities.includes("assetFolders")
        ? assetFolders.length
          ? renderSection({
              id: "assetFolders",
              header: `<div>Asset folders</div>
        ${addedNum(assetFolders.filter(isOp("addInto")).length, true)}
        ${removedNum(assetFolders.filter(isOp("remove")).length)}`,
              content: assetFolders.map(renderPatchOp).join("\n"),
            })
          : "<h3>No changes to asset folders.</h3>"
        : "",
  ],
  [
    "{{collections_section}}",
    ({ collections, entities }: DiffData) =>
      entities.includes("collections")
        ? collections.length
          ? renderSection({
              id: "collections-section",
              header: `<div>Collections</div>
          ${modifiedNum(collections.filter(isOp("replace")).length, true)}
          ${addedNum(collections.filter(isOp("addInto")).length)}
          ${removedNum(collections.filter(isOp("remove")).length)}`,
              content: collections.map(renderPatchOp).join("\n"),
            })
          : "<h3>No changes to collections</h3>"
        : "",
  ],
  [
    "{{spaces_section}}",
    ({ spaces, entities }: DiffData) =>
      entities.includes("spaces")
        ? getCombinedOpLength(spaces)
          ? renderEntitySection("spaces", spaces)
          : "<h3>No changes to spaces.</h3>"
        : "",
  ],
  [
    "{{languages_section}}",
    ({ languages, entities }: DiffData) =>
      entities.includes("languages")
        ? getCombinedOpLength(languages)
          ? renderEntitySection("languages", languages)
          : "<h3>No changes to languages</h3>"
        : "",
  ],
  [
    "{{workflows_section}}",
    ({ workflows, entities }: DiffData) =>
      entities.includes("workflows")
        ? getCombinedOpLength(workflows)
          ? renderEntitySection("workflows", workflows)
          : "<h3>No changes to workflows.</h3>"
        : "",
  ],
]);

// This is not type-safe as one can for example pass a function expecting addInto op into a value for move op, but doing something more robust is not worth the effort at the moment.
const patchOpRendererMap: ReadonlyMap<Operation, RenderFunction<PatchOperation>> = new Map([
  ["addInto", createRenderOp(renderAddIntoOpDetail) as RenderFunction<PatchOperation>],
  ["move", createRenderOp(renderMoveOpDetail) as RenderFunction<PatchOperation>],
  ["remove", createRenderOp(renderRemoveOpDetail) as RenderFunction<PatchOperation>],
  ["replace", createRenderOp(renderReplaceOpDetail) as RenderFunction<PatchOperation>],
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
    render: () => "Property <strong>name</strong>",
  },
  {
    regex: /^\/collections$/,
    render: () => "Collection for space",
  },
  {
    regex: /^\/codename$/,
    render: () => "Property <strong>codename</strong>",
  },
  {
    regex: /^\/codename:([^/]+)/,
    render: (match: string[]) => `Object <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/scopes\/codename:([^/]+)$/,
    render: (match: string[]) => `Scope <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/fallback_language$/,
    render: () => "Property <strong>fallback_language</strong>",
  },
  {
    regex: /^\/steps\/codename:([^/]+)\/color$/,
    render: (match: string[]) => `Color for step <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/([^/]+)$/,
    render: (match: string[]) =>
      `Property <strong>${match[2]}</strong> of element <strong>${match[1]}</strong>`,
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
    render: () => "Element",
  },
  {
    regex: /^\/content_groups$/,
    render: () => "Content group",
  },
  {
    regex: /^\/terms$/,
    render: () => "Top level term",
  },
  {
    regex: /steps$/,
    render: () => "Step",
  },
  {
    regex: /scopes$/,
    render: () => "Scope with the following configuration →",
  },
  {
    regex: /^\/steps\/codename:([^/]+)\/transitions_to$/,
    render: (match: string[]) => `Transition from step <strong>${match[1]}</strong> to step`,
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
    render: (match: string[]) =>
      `For rich text element <strong>${match[1]}</strong>, allowed block`,
  },
  {
    regex: /\/terms\/codename:([^/]+)/g,
    render: (matches: string[]) => renderTaxonomyPath(matches),
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_formatting$/,
    render: (match: string[]) =>
      `For rich text element <strong>${match[1]}</strong>, allowed formatting`,
  },
  {
    regex: /^\/elements\/codename:([^/]+)\/allowed_text_blocks$/,
    render: (match: string[]) =>
      `For rich text element <strong>${match[1]}</strong>, allowed text block`,
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
  {
    regex: /^\/steps\/codename:([^/]+)\/transitions_to\/codename:([^/]+)$/,
    render: (match: string[]) =>
      `Transition from step <strong>${match[1]}</strong> to step <strong>${match[2]}</strong>`,
  },
  {
    regex: /^\/steps\/codename:([^/]+)$/,
    render: (match: string[]) => `Step <strong>${match[1]}</strong>`,
  },
  {
    regex: /^\/codename:([^/]+)/,
    render: (match: string[]) => `Object <strong>${match[1]}</strong>`,
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
  {
    regex: /^\/codename:([^/]+)/,
    render: (match: string[]) => `Object <strong>${match[1]}</strong>`,
  },
];
