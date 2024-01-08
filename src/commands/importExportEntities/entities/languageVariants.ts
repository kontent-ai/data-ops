import {
  ElementContracts,
  LanguageVariantContracts,
  LanguageVariantElements,
  LanguageVariantElementsBuilder,
  ManagementClient,
} from "@kontent-ai/management-sdk";

import { serially } from "../../../utils/requests.js";
import { notNull } from "../../../utils/typeguards.js";
import { getRequired } from "../../import/utils.js";
import { EntityDefinition, ImportContext } from "../entityDefinition.js";
import { createReference } from "./utils/referece.js";
import { replaceRichTextReferences } from "./utils/richText.js";

export const languageVariantsEntity: EntityDefinition<
  ReadonlyArray<LanguageVariantContracts.ILanguageVariantModelContract>
> = {
  name: "languageVariants",
  fetchEntities: async client => {
    const collections = await client.listCollections().toPromise().then(res => res.data.collections);

    const promises = collections.map(collection => () =>
      client
        .listLanguageVariantsByCollection()
        .byCollectionCodename(collection.codename)
        .toAllPromise()
        .then(res => res.responses.flatMap(res => res.rawData.variants))
    );

    const variants = await serially(promises);

    return variants.flatMap(arr => arr);
  },
  serializeEntities: JSON.stringify,
  deserializeEntities: JSON.parse,
  importEntities: async (client, fileVariants, context) => {
    await serially(fileVariants.map(createImportVariant(client, context)));
  },
};

const createImportVariant =
  (client: ManagementClient, context: ImportContext) =>
  (fileVariant: LanguageVariantContracts.ILanguageVariantModelContract) =>
  async (): Promise<true> => {
    const typeContext = getRequired(
      context.contentTypeContextByOldIds,
      getRequired(context.contentItemContextByOldIds, fileVariant.item.id ?? "", "content item").oldTypeId,
      "content type",
    );

    const newWorkflowContext = findTargetWfStep(context, fileVariant);

    const projectVariant = await client
      .upsertLanguageVariant()
      .byItemId(getRequired(context.contentItemContextByOldIds, fileVariant.item.id ?? "", "content item").selfId)
      .byLanguageId(getRequired(context.languageIdsByOldIds, fileVariant.language.id ?? "", "language"))
      .withData(builder => ({
        workflow: {
          workflow_identifier: {
            id: newWorkflowContext.wfId,
          },
          step_identifier: {
            id: newWorkflowContext.wfStepId,
          },
        },
        elements: fileVariant.elements.map(createTransformElement({
          builder,
          context,
          elementIdByOldId: typeContext.elementIdsByOldIds,
          elementTypeByOldId: typeContext.elementTypeByOldIds,
          multiChoiceOptionIdsByOldIdsByOldElementId: typeContext.multiChoiceOptionIdsByOldIdsByOldElementId,
        }))
          .filter(notNull),
      }))
      .toPromise()
      .then(res => res.rawData);

    switch (newWorkflowContext.nextAction.action) {
      case "none":
        return true;
      case "publish":
        await publishVariant(client, projectVariant);
        return true;
      case "schedule":
        await publishVariant(client, projectVariant, newWorkflowContext.nextAction.to);
        return true;
      case "archive":
        await publishVariant(client, projectVariant);
        await client
          .unpublishLanguageVariant()
          .byItemId(projectVariant.item.id ?? "")
          .byLanguageId(projectVariant.language.id ?? "")
          .withoutData()
          .toPromise();
        return true;
    }
  };

const publishVariant = (
  client: ManagementClient,
  variant: LanguageVariantContracts.ILanguageVariantModelContract,
  scheduleTo?: Date,
) => {
  const sharedRequest = client
    .publishLanguageVariant()
    .byItemId(variant.item.id ?? "")
    .byLanguageId(variant.language.id ?? "");

  return scheduleTo
    ? sharedRequest
      .withData({
        scheduled_to: scheduleTo.toISOString(),
      })
      .toPromise()
    : sharedRequest
      .withoutData()
      .toPromise();
};

type TransformElementParams = Readonly<{
  context: ImportContext;
  builder: LanguageVariantElementsBuilder;
  elementTypeByOldId: ReadonlyMap<string, string>;
  elementIdByOldId: ReadonlyMap<string, string>;
  multiChoiceOptionIdsByOldIdsByOldElementId: ReadonlyMap<string, ReadonlyMap<string, string>>;
}>;

const createTransformElement = (params: TransformElementParams) =>
(
  fileElement: ElementContracts.IContentItemElementContract,
): LanguageVariantElements.ILanguageVariantElementBase | null => {
  const elementType = params.elementTypeByOldId.get(fileElement.element.id ?? "");
  const projectElementId = params.elementIdByOldId.get(fileElement.element.id ?? "");
  if (!elementType || !projectElementId) {
    return null; // Ignore elements that are not present in the type (This can happen for example when you remove an element from a type that already has variants)
  }

  switch (elementType) {
    case "asset": {
      const typedElement = fileElement as LanguageVariantElements.IAssetInVariantElement;
      return params.builder.assetElement({
        element: { id: projectElementId },
        value: typedElement.value
          .map(ref =>
            createReference({
              newId: params.context.assetIdsByOldIds.get(ref.id ?? ""),
              oldId: ref.id,
              entityName: "asset",
            })
          ),
      });
    }
    case "custom": {
      const typedElement = fileElement as LanguageVariantElements.ICustomElementInVariantElement;
      return params.builder.customElement({
        element: { id: projectElementId },
        value: typedElement.value,
        searchable_value: typedElement.searchable_value,
      });
    }
    case "date_time": {
      const typedElement = fileElement as LanguageVariantElements.IDateTimeInVariantElement;
      return params.builder.dateTimeElement({
        element: { id: projectElementId },
        value: typedElement.value,
      });
    }
    case "modular_content": {
      const typedElement = fileElement as LanguageVariantElements.ILinkedItemsInVariantElement;
      return params.builder.linkedItemsElement({
        element: { id: projectElementId },
        value: typedElement.value
          .map(ref =>
            createReference({
              newId: params.context.contentItemContextByOldIds.get(ref.id ?? "")?.selfId,
              oldId: ref.id,
              entityName: "item",
            })
          ),
      });
    }
    case "multiple_choice": {
      const typedElement = fileElement as LanguageVariantElements.IMultipleChoiceInVariantElement;
      const optionIdsByOldIds = getRequired(
        params.multiChoiceOptionIdsByOldIdsByOldElementId,
        typedElement.element.id ?? "",
        "content element",
      );

      return params.builder.multipleChoiceElement({
        element: { id: projectElementId },
        value: typedElement.value.map(ref => ({
          id: getRequired(optionIdsByOldIds, ref.id ?? "", "multi-choice element option"),
        })),
      });
    }
    case "number": {
      const typedElement = fileElement as LanguageVariantElements.INumberInVariantElement;
      return params.builder.numberElement({
        element: { id: projectElementId },
        value: typedElement.value,
      });
    }
    case "rich_text": {
      const typedElement = fileElement as LanguageVariantElements.IRichtextInVariantElement;
      return params.builder.richTextElement({
        element: { id: projectElementId },
        value: typedElement.value
          ? replaceRichTextReferences(
            typedElement.value,
            params.context,
            new Set(typedElement.components?.map(c => c.id) ?? []),
          )
          : typedElement.value,
        components: typedElement.components?.map(c => {
          const typeContext = getRequired(params.context.contentTypeContextByOldIds, c.type.id ?? "", "content type");

          return ({
            id: c.id,
            type: { id: typeContext.selfId },
            elements: c.elements.map(createTransformElement({
              ...params,
              elementIdByOldId: typeContext.elementIdsByOldIds,
              elementTypeByOldId: typeContext.elementTypeByOldIds,
              multiChoiceOptionIdsByOldIdsByOldElementId: typeContext.multiChoiceOptionIdsByOldIdsByOldElementId,
            }))
              .filter(notNull),
          });
        }),
      });
    }
    case "subpages": {
      const typedElement = fileElement as LanguageVariantElements.ILinkedItemsInVariantElement;
      return params.builder.linkedItemsElement({
        element: { id: projectElementId },
        value: typedElement.value.map(ref =>
          createReference({
            newId: params.context.contentItemContextByOldIds.get(ref.id ?? "")?.selfId,
            oldId: ref.id,
            entityName: "item",
          })
        ),
      });
    }
    case "taxonomy": {
      const typedElement = fileElement as LanguageVariantElements.ITaxonomyInVariantElement;
      return params.builder.taxonomyElement({
        element: { id: projectElementId },
        value: typedElement.value
          .map(ref =>
            createReference({
              newId: params.context.taxonomyTermIdsByOldIds.get(ref.id ?? ""),
              oldId: ref.id,
              entityName: "taxonomy-term",
            })
          ),
      });
    }
    case "text": {
      const typedElement = fileElement as LanguageVariantElements.ITextInVariantElement;
      return params.builder.textElement({
        element: { id: projectElementId },
        value: typedElement.value,
      });
    }
    case "url_slug": {
      const typedElement = fileElement as LanguageVariantElements.IUrlSlugInVariantElement;
      return params.builder.urlSlugElement({
        element: { id: projectElementId },
        value: typedElement.value,
        mode: typedElement.mode,
      });
    }
    default:
      throw new Error(`Found an element "${JSON.stringify(fileElement)}" of an unknown type.`);
  }
};

type FindWfStepResult = Readonly<{
  wfStepId: string;
  wfId: string;
  nextAction:
    | Readonly<{ action: "none" }>
    | Readonly<{ action: "publish" }>
    | Readonly<{ action: "archive" }>
    | Readonly<{ action: "schedule"; to: Date }>;
}>;

const findTargetWfStep = (
  context: ImportContext,
  oldWf: LanguageVariantContracts.ILanguageVariantModelContract,
): FindWfStepResult => {
  const wfContext = getRequired(context.workflowIdsByOldIds, oldWf.workflow.workflow_identifier.id ?? "", "workflow");

  const translateStepId = createTranslateWfStepId(context);

  switch (oldWf.workflow.step_identifier.id) {
    case wfContext.oldPublishedStepId:
      return {
        wfId: wfContext.selfId,
        wfStepId: translateStepId(wfContext.anyStepIdLeadingToPublishedStep),
        nextAction: { action: "publish" },
      };
    case wfContext.oldScheduledStepId:
      return {
        wfId: wfContext.selfId,
        wfStepId: translateStepId(wfContext.anyStepIdLeadingToPublishedStep),
        nextAction: { action: "publish" }, // There is no way to determing the date when the variant should be published using the current MAPI so we will publish it immediately instead for now
      };
    case wfContext.oldArchivedStepId:
      return {
        wfId: wfContext.selfId,
        wfStepId: translateStepId(wfContext.anyStepIdLeadingToPublishedStep),
        nextAction: { action: "archive" },
      };
    default: {
      return {
        wfId: wfContext.selfId,
        wfStepId: oldWf.workflow.step_identifier.id ?? "",
        nextAction: { action: "none" },
      };
    }
  }
};

const createTranslateWfStepId = (context: ImportContext) => (stepId: string): string =>
  getRequired(context.worfklowStepsIdsWithTransitionsByOldIds, stepId, "workflow step").selfId;
