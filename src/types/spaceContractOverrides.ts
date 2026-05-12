import type { SharedContracts, SpaceContracts } from "@kontent-ai/management-sdk";

// TODO(sdk-root-item): remove this file when @kontent-ai/management-sdk adds
// `root_item` to `ISpaceContract`. Grep this tag to find every consumer.
export type SpaceWithRootItem = Readonly<{
  root_item?: SharedContracts.IReferenceObjectContract;
}>;

export type SpaceContractWithRootItem = SpaceContracts.ISpaceContract & SpaceWithRootItem;
