import { type DeliveryClient, Filters, Parameters } from "@kontent-ai/delivery-sdk";
import { describe, expect, it, vi } from "vitest";

import { deliveryApiItemsLimit, fetchItems } from "../../../src/utils/deliveryHelpers.ts";

const createMockClient = (responses: unknown[] = [{}]) => {
  const withParameters = vi.fn().mockReturnThis();
  const toAllPromise = vi.fn().mockResolvedValue({
    data: { responses: responses.map((r) => ({ data: r })) },
  });
  const items = vi.fn(() => ({ withParameters, toAllPromise }));

  return { client: { items } as unknown as DeliveryClient, withParameters, toAllPromise };
};

describe("fetchItems", () => {
  describe("parameter construction", () => {
    it("constructs correct parameters for items filter mode", async () => {
      const items = ["item1", "item2"];
      const { client, withParameters } = createMockClient();

      await fetchItems(client, { language: "default", items });

      expect(withParameters).toHaveBeenCalledWith([
        new Parameters.DepthParameter(0),
        new Parameters.LanguageParameter("default"),
        new Parameters.LimitParameter(deliveryApiItemsLimit),
        new Filters.InFilter("system.codename", items),
      ]);
    });

    it("constructs correct parameters for last filter mode", async () => {
      const { client, withParameters } = createMockClient();
      const last = 10;

      await fetchItems(client, { language: "default", last });

      expect(withParameters).toHaveBeenCalledWith([
        new Parameters.DepthParameter(0),
        new Parameters.LanguageParameter("default"),
        new Parameters.LimitParameter(last),
        new Parameters.OrderParameter("system.last_modified", "desc"),
      ]);
    });

    it("constructs correct parameters for byTypesCodenames filter mode", async () => {
      const byTypesCodenames = ["type1", "type2"];
      const { client, withParameters } = createMockClient();

      await fetchItems(client, { language: "default", byTypesCodenames });

      expect(withParameters).toHaveBeenCalledWith([
        new Parameters.DepthParameter(0),
        new Parameters.LanguageParameter("default"),
        new Parameters.LimitParameter(deliveryApiItemsLimit),
        new Filters.InFilter("system.type", byTypesCodenames),
      ]);
    });

    it("constructs correct parameters for custom filter mode", async () => {
      const filter = "system.codename=123";
      const { client, withParameters } = createMockClient();

      await fetchItems(client, { language: "default", filter });

      expect(withParameters).toHaveBeenCalledWith([
        new Parameters.DepthParameter(0),
        new Parameters.LanguageParameter("default"),
        new Parameters.LimitParameter(deliveryApiItemsLimit),
        new Parameters.CustomParameter(filter),
      ]);
    });

    it("constructs correct parameters for collection filter mode", async () => {
      const collection = "my-collection";
      const { client, withParameters } = createMockClient();

      await fetchItems(client, { language: "default", collection });

      expect(withParameters).toHaveBeenCalledWith([
        new Parameters.DepthParameter(0),
        new Parameters.LanguageParameter("default"),
        new Parameters.LimitParameter(deliveryApiItemsLimit),
        new Filters.InFilter("system.collection", [collection]),
      ]);
    });

    it("uses provided depth instead of default 0", async () => {
      const { client, withParameters } = createMockClient();

      await fetchItems(client, { language: "default", depth: 5, items: ["item1"] });

      expect(withParameters).toHaveBeenCalledWith([
        new Parameters.DepthParameter(5),
        new Parameters.LanguageParameter("default"),
        new Parameters.LimitParameter(deliveryApiItemsLimit),
        new Filters.InFilter("system.codename", ["item1"]),
      ]);
    });

    it("uses provided language", async () => {
      const { client, withParameters } = createMockClient();

      await fetchItems(client, { language: "en-US", items: ["item1"] });

      expect(withParameters).toHaveBeenCalledWith([
        new Parameters.DepthParameter(0),
        new Parameters.LanguageParameter("en-US"),
        new Parameters.LimitParameter(deliveryApiItemsLimit),
        new Filters.InFilter("system.codename", ["item1"]),
      ]);
    });

    it("uses provided limit as pageSize", async () => {
      const { client, withParameters } = createMockClient();

      await fetchItems(client, { language: "default", limit: 50, items: ["item1"] });

      expect(withParameters).toHaveBeenCalledWith([
        new Parameters.DepthParameter(0),
        new Parameters.LanguageParameter("default"),
        new Parameters.LimitParameter(50),
        new Filters.InFilter("system.codename", ["item1"]),
      ]);
    });
  });

  describe("pagination", () => {
    it("uses last value as pageSize when last <= 2000", async () => {
      const { client, withParameters, toAllPromise } = createMockClient();

      await fetchItems(client, { language: "default", last: 500 });

      expect(withParameters).toHaveBeenCalledWith([
        new Parameters.DepthParameter(0),
        new Parameters.LanguageParameter("default"),
        new Parameters.LimitParameter(500),
        new Parameters.OrderParameter("system.last_modified", "desc"),
      ]);
      expect(toAllPromise).toHaveBeenCalledWith({ pages: 1 });
    });

    it("uses pageSize of 100 when last > 2000", async () => {
      const { client, withParameters, toAllPromise } = createMockClient();

      await fetchItems(client, { language: "default", last: 3000 });

      expect(withParameters).toHaveBeenCalledWith([
        new Parameters.DepthParameter(0),
        new Parameters.LanguageParameter("default"),
        new Parameters.LimitParameter(100),
        new Parameters.OrderParameter("system.last_modified", "desc"),
      ]);
      expect(toAllPromise).toHaveBeenCalledWith({ pages: 30 });
    });

    it("calculates correct number of pages for last parameter", async () => {
      const { client, withParameters, toAllPromise } = createMockClient();

      await fetchItems(client, { language: "default", last: 250 });

      expect(withParameters).toHaveBeenCalledWith([
        new Parameters.DepthParameter(0),
        new Parameters.LanguageParameter("default"),
        new Parameters.LimitParameter(250),
        new Parameters.OrderParameter("system.last_modified", "desc"),
      ]);
      expect(toAllPromise).toHaveBeenCalledWith({ pages: 1 });
    });

    it("uses deliveryApiItemsLimit as pages when using items filter", async () => {
      const { client, toAllPromise } = createMockClient();

      await fetchItems(client, { language: "default", items: ["item1"] });

      expect(toAllPromise).toHaveBeenCalledWith({ pages: deliveryApiItemsLimit });
    });

    it("caps pageSize at deliveryApiItemsLimit when limit exceeds it", async () => {
      const { client, withParameters } = createMockClient();

      await fetchItems(client, { language: "default", limit: 5000, items: ["item1"] });

      expect(withParameters).toHaveBeenCalledWith([
        new Parameters.DepthParameter(0),
        new Parameters.LanguageParameter("default"),
        new Parameters.LimitParameter(deliveryApiItemsLimit),
        new Filters.InFilter("system.codename", ["item1"]),
      ]);
    });
  });
});
