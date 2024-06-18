import { MigrationOrder } from "../models/migration.js";

export const orderComparator = (prevOrder: MigrationOrder, nextOrder: MigrationOrder) => {
  if (typeof prevOrder === "number" && typeof nextOrder === "number") {
    return prevOrder - nextOrder;
  }

  if (prevOrder instanceof Date && nextOrder instanceof Date) {
    return prevOrder.getTime() - nextOrder.getTime();
  }

  return typeof prevOrder === "number" ? -1 : 1;
};

export const createOrderComparator =
  <Entity>(order: "desc" | "asc", getOrder: (entity: Entity) => MigrationOrder) => (entity1: Entity, entity2: Entity) =>
    order === "desc"
      ? -orderComparator(getOrder(entity1), getOrder(entity2))
      : orderComparator(getOrder(entity1), getOrder(entity2));
