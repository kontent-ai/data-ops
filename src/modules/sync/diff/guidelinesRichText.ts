import {
  assetAttributeName,
  assetExternalIdAttributeName,
  itemExternalIdLinkAttributeName,
  itemLinkAttributeName,
} from "../../../constants/richText.js";
import {
  customAssetCodenameAttributeName,
  customItemLinkCodenameAttributeName,
} from "../../constants/syncRichText.js";

export type OriginalReference = Readonly<
  { codename: string; externalId?: string } | { codename?: string; externalId: string }
>;

type Replacement = string | Readonly<{ internalId: string }> | Readonly<{ externalId: string }>;

type ReplaceReferencesParams = Readonly<{
  referencesRegex: RegExp;
  internalIdAttributeName: string;
  codenameAttributeName: string;
  externalIdAttributeName: string;
}>;

const createGetReferences =
  (regex: RegExp) =>
  (guidelines: string): ReadonlyArray<OriginalReference> =>
    [...guidelines.matchAll(regex)].map(
      (match) =>
        ({
          codename: match.groups?.[codenameGroupName] ?? match.groups?.[codename2GroupName],
          externalId: match.groups?.[externalIdGroupName] ?? match.groups?.[externalId2GroupName],
        }) as OriginalReference,
    );

const createReplaceReferences =
  (params: ReplaceReferencesParams) =>
  (guidelines: string, replacer: (reference: OriginalReference) => Replacement) =>
    guidelines.replaceAll(params.referencesRegex, (match, ...[, , , , , , groups]) => {
      // In the arguments we must first skip the groups (4), offset and the whole string, then there is the groups object. See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_function_as_the_replacement for more details
      const codename = groups[codenameGroupName] ?? groups[codename2GroupName];
      const externalId = groups[externalIdGroupName] ?? groups[externalId2GroupName];

      const result = replacer({ codename, externalId });

      const newValue =
        typeof result === "string"
          ? result
          : "internalId" in result
            ? `${params.internalIdAttributeName}="${result.internalId}"`
            : `${params.externalIdAttributeName}="${result.externalId}"`;

      return match
        .replaceAll(
          new RegExp(`${params.codenameAttributeName}="[^"]*"`, "gi"),
          externalId ? "" : newValue,
        ) // only put here the new value when there is not external id attribute, otherwise the new value will be put in place of the external id
        .replaceAll(new RegExp(`${params.externalIdAttributeName}="[^"]*"`, "gi"), newValue);
    });

const makeAttrLookAhead = (attributeName: string) => `(?!${attributeName.slice(1)}=)`; // Look ahead whether we are already parsing the attribute (we already are on the first letter)

const codenameGroupName = "codename";
const codename2GroupName = "codename2";
const externalIdGroupName = "externalId";
const externalId2GroupName = "externalId2";

const itemCodenameAttributeLookAhead = makeAttrLookAhead(customItemLinkCodenameAttributeName);
const itemExternalIdAttributeLookAhead = makeAttrLookAhead(itemExternalIdLinkAttributeName);

const anythingButItemAttributes = `(?:[^>]${itemCodenameAttributeLookAhead}${itemExternalIdAttributeLookAhead})*`;

const oneOfItemAttributes = (codenameGroup: string, externalIdGroup: string) =>
  `(?:(?:${customItemLinkCodenameAttributeName}="(?<${codenameGroup}>[^"]*)")|(?:${itemExternalIdLinkAttributeName}="(?<${externalIdGroup}>[^"]*)"))`;

const itemReferenceRegex = new RegExp(
  `<${anythingButItemAttributes}${oneOfItemAttributes(
    codenameGroupName,
    externalIdGroupName,
  )}${anythingButItemAttributes}${oneOfItemAttributes(codename2GroupName, externalId2GroupName)}?[^>]*>`,
  "gi",
);

const assetCodenameAttributeLookAhead = makeAttrLookAhead(customAssetCodenameAttributeName);
const assetExternalIdAttributeLookAhead = makeAttrLookAhead(assetExternalIdAttributeName);

const anythingButAssetAttributes = `(?:[^>]${assetCodenameAttributeLookAhead}${assetExternalIdAttributeLookAhead})*`;

const oneOfAssetAttributes = (codenameGroup: string, externalIdGroup: string) =>
  `(?:(?:${customAssetCodenameAttributeName}="(?<${codenameGroup}>[^"]*)")|(?:${assetExternalIdAttributeName}="(?<${externalIdGroup}>[^"]*)"))`;

const assetReferenceRegex = new RegExp(
  `<${anythingButAssetAttributes}${oneOfAssetAttributes(
    codenameGroupName,
    externalIdGroupName,
  )}${anythingButAssetAttributes}${oneOfAssetAttributes(codename2GroupName, externalId2GroupName)}?[^>]*>`,
  "gi",
);

export const replaceItemReferences = createReplaceReferences({
  referencesRegex: itemReferenceRegex,
  internalIdAttributeName: itemLinkAttributeName,
  codenameAttributeName: customItemLinkCodenameAttributeName,
  externalIdAttributeName: itemExternalIdLinkAttributeName,
});

export const replaceAssetReferences = createReplaceReferences({
  referencesRegex: assetReferenceRegex,
  internalIdAttributeName: assetAttributeName,
  codenameAttributeName: customAssetCodenameAttributeName,
  externalIdAttributeName: assetExternalIdAttributeName,
});

export const getItemReferences = createGetReferences(itemReferenceRegex);

export const getAssetReferences = createGetReferences(assetReferenceRegex);
