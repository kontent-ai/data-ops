import type {
  ElementContracts,
  LanguageVariantContracts,
  LanguageVariantElements,
  LanguageVariantElementsBuilder,
  ManagementClient,
} from "@kontent-ai/management-sdk";

import { type LogOptions, logInfo, logWarning } from "../../../../log.js";
import { handleKontentErrors } from "../../../../utils/error.js";
import { createAssetExternalId, createItemExternalId } from "../../../../utils/externalIds.js";
import { serially } from "../../../../utils/requests.js";
import { notNull } from "../../../../utils/typeguards.js";
import type { ReplaceReferences } from "../../../../utils/types.js";
import { getRequired } from "../../utils/utils.js";
import type { EntityDefinition, RestoreContext } from "../entityDefinition.js";
import { createReference } from "./utils/reference.js";
import { replaceImportRichTextReferences } from "./utils/richText.js";

type Variant = ReplaceReferences<LanguageVariantContracts.ILanguageVariantModelContract>;

export const languageVariantsEntity = {
  name: "languageVariants",
  displayName: "languageVariants",
  fetchEntities: async (client) => {
    const collections = await client
      .listCollections()
      .toPromise()
      .then((res) => res.data.collections);

    const promises = collections.map(
      (collection) => () =>
        client
          .listLanguageVariantsByCollection()
          .byCollectionCodename(collection.codename)
          .toAllPromise()
          .then((res) => res.responses.flatMap((res) => res.rawData.variants)),
    );

    const variants = await serially(promises);

    return variants.flat() as ReadonlyArray<Variant>;
  },
  serializeEntities: JSON.stringify,
  deserializeEntities: JSON.parse,
  importEntities: async (client, { entities: fileVariants, context, logOptions }) => {
    await serially(fileVariants.map(createImportVariant(client, context, logOptions)));

    return context;
  },
} as const satisfies Omit<EntityDefinition<ReadonlyArray<Variant>>, "cleanEntities">;

const createImportVariant =
  (client: ManagementClient, context: RestoreContext, logOptions: LogOptions) =>
  (fileVariant: Variant) =>
  async (): Promise<true> => {
    const typeContext = getRequired(
      context.contentTypeContextByOldIds,
      getRequired(context.contentItemContextByOldIds, fileVariant.item.id, "content item")
        .oldTypeId,
      "content type",
    );

    const newWorkflowContext = findTargetWfStep(context, fileVariant);

    logInfo(
      logOptions,
      "verbose",
      `Importing: variant of item ${fileVariant.item.id} of language ${fileVariant.language.id}`,
    );

    const projectVariant = await client
      .upsertLanguageVariant()
      .byItemId(
        getRequired(context.contentItemContextByOldIds, fileVariant.item.id, "content item").selfId,
      )
      .byLanguageId(getRequired(context.languageIdsByOldIds, fileVariant.language.id, "language"))
      .withData((builder) => ({
        workflow: {
          workflow_identifier: {
            id: newWorkflowContext.wfId,
          },
          step_identifier: {
            id: newWorkflowContext.wfStepId,
          },
        },
        elements: fileVariant.elements
          .map(
            createTransformElement({
              builder,
              context,
              elementIdByOldId: typeContext.elementIdsByOldIds,
              elementTypeByOldId: typeContext.elementTypeByOldIds,
              multiChoiceOptionIdsByOldIdsByOldElementId:
                typeContext.multiChoiceOptionIdsByOldIdsByOldElementId,
              logOptions,
            }),
          )
          .filter(notNull),
      }))
      .toPromise()
      .then((res) => res.rawData as Variant);

    switch (newWorkflowContext.nextAction.action) {
      case "none":
        return true;
      case "publish":
        await publishVariant(client, logOptions, projectVariant);
        return true;
      case "schedule":
        await publishVariant(client, logOptions, projectVariant, newWorkflowContext.nextAction.to);
        return true;
      case "archive": {
        const wasPublished = await publishVariant(client, logOptions, projectVariant);

        logInfo(
          logOptions,
          "verbose",
          `Archiving: variant of item ${projectVariant.item.id} of langauge ${projectVariant.language.id}`,
        );

        if (wasPublished) {
          await client
            .unpublishLanguageVariant()
            .byItemId(projectVariant.item.id)
            .byLanguageId(projectVariant.language.id)
            .withoutData()
            .toPromise();
        } else {
          // remove this once we add element requirements after variants are imported
          logWarning(
            logOptions,
            "standard",
            `Skipping archiving of item ${projectVariant.item.id} of langauge ${projectVariant.language.id}, because it could not be published.`,
          );
        }

        return true;
      }
    }
  };

const publishVariant = (
  client: ManagementClient,
  logOptions: LogOptions,
  variant: Variant,
  scheduleTo?: Date,
) => {
  const sharedRequest = client
    .publishLanguageVariant()
    .byItemId(variant.item.id)
    .byLanguageId(variant.language.id);

  logInfo(
    logOptions,
    "verbose",
    `${
      scheduleTo ? "Scheduling" : "Publishing"
    }: variant of item ${variant.item.id} of language ${variant.language.id}`,
  );

  const incompleteElementsErrorCodes = [4040027, 4040028];

  return (
    (
      scheduleTo
        ? sharedRequest
            .withData({
              scheduled_to: scheduleTo.toISOString(),
            })
            .toPromise()
        : sharedRequest.withoutData().toPromise()
    )
      .then(() => true)
      // remove this once we add element requirements after variants are imported
      .catch(
        handleKontentErrors(() => {
          logWarning(
            logOptions,
            "standard",
            `Skipping ${
              scheduleTo ? "scheduling" : "publishing"
            } of variant of item ${variant.item.id} of langauge ${variant.language.id}, because some of its elements are incomplete. Please check the variant's elements.`,
          );

          return Promise.resolve(false);
        }, incompleteElementsErrorCodes),
      )
  );
};

type TransformElementParams = Readonly<{
  context: RestoreContext;
  builder: LanguageVariantElementsBuilder;
  elementTypeByOldId: ReadonlyMap<string, string>;
  elementIdByOldId: ReadonlyMap<string, string>;
  multiChoiceOptionIdsByOldIdsByOldElementId: ReadonlyMap<string, ReadonlyMap<string, string>>;
  logOptions: LogOptions;
}>;

type Element = ReplaceReferences<ElementContracts.IContentItemElementContract>;

const createTransformElement =
  (params: TransformElementParams) =>
  (fileElement: Element): LanguageVariantElements.ILanguageVariantElementBase | null => {
    const elementType = params.elementTypeByOldId.get(fileElement.element.id);
    const projectElementId = params.elementIdByOldId.get(fileElement.element.id);
    if (!(elementType && projectElementId)) {
      return null; // Ignore elements that are not present in the type (This can happen for example when you remove an element from a type that already has variants)
    }

    switch (elementType) {
      case "asset": {
        const typedElement =
          fileElement as ReplaceReferences<LanguageVariantElements.IAssetInVariantElement>;
        return params.builder.assetElement({
          element: { id: projectElementId },
          value:
            typedElement.value?.map((ref) => {
              const sourceAssetCodename = params.context.oldAssetCodenamesByIds.get(ref.id);
              const targetAssetId = params.context.assetIdsByOldIds.get(ref.id);

              return targetAssetId
                ? { id: targetAssetId }
                : { external_id: createAssetExternalId(sourceAssetCodename ?? ref.id) };
            }) ?? null,
        });
      }
      case "custom": {
        const typedElement =
          fileElement as ReplaceReferences<LanguageVariantElements.ICustomElementInVariantElement>;
        return params.builder.customElement({
          element: { id: projectElementId },
          value: typedElement.value,
          searchable_value: typedElement.searchable_value,
        });
      }
      case "date_time": {
        const typedElement = fileElement as ReplaceReferences<
          LanguageVariantElements.IDateTimeInVariantElement & { display_timezone: string } // incorrect SDK types
        >;
        return params.builder.dateTimeElement({
          element: { id: projectElementId },
          value: typedElement.value,
          display_timezone: typedElement.display_timezone,
        } as LanguageVariantElements.IDateTimeInVariantElement); // incorrect SDK types
      }
      case "modular_content": {
        const typedElement =
          fileElement as ReplaceReferences<LanguageVariantElements.ILinkedItemsInVariantElement>;
        return params.builder.linkedItemsElement({
          element: { id: projectElementId },
          value:
            typedElement.value?.map((ref) => {
              const sourceItemCodename = params.context.oldContentItemCodenamesByIds.get(ref.id);
              const targetItemId = params.context.contentItemContextByOldIds.get(ref.id)?.selfId;

              return targetItemId
                ? { id: targetItemId }
                : { external_id: createItemExternalId(sourceItemCodename ?? ref.id) };
            }) ?? null,
        });
      }
      case "multiple_choice": {
        const typedElement =
          fileElement as ReplaceReferences<LanguageVariantElements.IMultipleChoiceInVariantElement>;
        const optionIdsByOldIds = getRequired(
          params.multiChoiceOptionIdsByOldIdsByOldElementId,
          typedElement.element.id,
          "content element",
        );

        return params.builder.multipleChoiceElement({
          element: { id: projectElementId },
          value:
            typedElement.value?.map((ref) => ({
              id: getRequired(optionIdsByOldIds, ref.id, "multi-choice element option"),
            })) ?? null,
        });
      }
      case "number": {
        const typedElement =
          fileElement as ReplaceReferences<LanguageVariantElements.INumberInVariantElement>;
        return params.builder.numberElement({
          element: { id: projectElementId },
          value: typedElement.value,
        });
      }
      case "rich_text": {
        const typedElement =
          fileElement as ReplaceReferences<LanguageVariantElements.IRichtextInVariantElement>;
        return params.builder.richTextElement({
          element: { id: projectElementId },
          value: typedElement.value
            ? replaceImportRichTextReferences(
                typedElement.value,
                params.context,
                new Set(typedElement.components?.map((c) => c.id) ?? []),
                params.logOptions,
              )
            : typedElement.value,
          components: typedElement.components?.map((c) => {
            const typeContext = getRequired(
              params.context.contentTypeContextByOldIds,
              c.type.id,
              "content type",
            );

            return {
              id: c.id,
              type: { id: typeContext.selfId },
              elements: (c.elements as Element[])
                .map(
                  createTransformElement({
                    ...params,
                    elementIdByOldId: typeContext.elementIdsByOldIds,
                    elementTypeByOldId: typeContext.elementTypeByOldIds,
                    multiChoiceOptionIdsByOldIdsByOldElementId:
                      typeContext.multiChoiceOptionIdsByOldIdsByOldElementId,
                  }),
                )
                .filter(notNull),
            };
          }),
        });
      }
      case "subpages": {
        const typedElement =
          fileElement as ReplaceReferences<LanguageVariantElements.ILinkedItemsInVariantElement>;
        return params.builder.linkedItemsElement({
          element: { id: projectElementId },
          value:
            typedElement.value?.map((ref) => {
              const sourceItemCodename = params.context.oldContentItemCodenamesByIds.get(ref.id);
              const targetItemId = params.context.contentItemContextByOldIds.get(ref.id)?.selfId;

              return targetItemId
                ? { id: targetItemId }
                : { external_id: createItemExternalId(sourceItemCodename ?? ref.id) };
            }) ?? null,
        });
      }
      case "taxonomy": {
        const typedElement =
          fileElement as ReplaceReferences<LanguageVariantElements.ITaxonomyInVariantElement>;
        return params.builder.taxonomyElement({
          element: { id: projectElementId },
          value:
            typedElement.value?.map((ref) =>
              createReference({
                newId: params.context.taxonomyTermIdsByOldIds.get(ref.id),
                oldId: ref.id,
                entityName: "taxonomy-term",
              }),
            ) ?? null,
        });
      }
      case "text": {
        const typedElement =
          fileElement as ReplaceReferences<LanguageVariantElements.ITextInVariantElement>;
        return params.builder.textElement({
          element: { id: projectElementId },
          value: typedElement.value,
        });
      }
      case "url_slug": {
        const typedElement =
          fileElement as ReplaceReferences<LanguageVariantElements.IUrlSlugInVariantElement>;
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

const findTargetWfStep = (context: RestoreContext, oldWf: Variant): FindWfStepResult => {
  const wfContext = getRequired(
    context.workflowIdsByOldIds,
    oldWf.workflow.workflow_identifier.id,
    "workflow",
  );

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
        wfStepId: translateStepId(wfContext.oldDraftStepId),
        nextAction: { action: "none" }, // TODO: Change this to schedule once propert schedule export from MAPI is supported
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
        wfStepId: translateStepId(oldWf.workflow.step_identifier.id),
        nextAction: { action: "none" },
      };
    }
  }
};

const createTranslateWfStepId =
  (context: RestoreContext) =>
  (stepId: string): string =>
    getRequired(context.workflowStepsIdsWithTransitionsByOldIds, stepId, "workflow step").selfId;
