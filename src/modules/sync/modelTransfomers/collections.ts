import { CollectionContracts } from "@kontent-ai/management-sdk";

import { omit } from "../../../utils/object.js";

export const transformCollectionsModel = (collections: ReadonlyArray<CollectionContracts.ICollectionContract>) =>
  collections.map(c => omit(c, ["id"]));
