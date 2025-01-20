import { Filters, IContentItem, IContentItemElements, Parameters, Responses } from "@kontent-ai/delivery-sdk";
import { describe, expect, it } from "vitest";

import {
  extractItemsCodenamesFromResponse,
  getDeliveryUrlParams,
} from "../../../src/modules/migrateContent/migrateContent.ts";
import * as deliveryHelpers from "../../../src/modules/migrateContent/utils/deliveryHelpers.ts";

describe("createDeliveryUrlParameters", () => {
  it("should return correct parameters for language and last parameter", () => {
    const params = {
      language: "default",
      limit: 10,
    } as const;

    const parameters = deliveryHelpers.createDeliveryUrlParameters(params);

    expect(parameters).toStrictEqual([
      new Parameters.LanguageParameter(params.language),
      new Parameters.LimitParameter(params.limit),
    ]);
  });

  it("should return correct parameters for all parameter", () => {
    const params = {
      limit: 10,
      depth: 100,
      language: "default",
      order: ["system.codename", "asc"],
      inFilter: ["codename", ["item1", "item2"]],
    } as const;

    const parameters = deliveryHelpers.createDeliveryUrlParameters(params);

    expect(parameters).toStrictEqual([
      new Parameters.DepthParameter(params.depth),
      new Parameters.LanguageParameter(params.language),
      new Parameters.LimitParameter(params.limit),
      new Parameters.OrderParameter(params.order[0], params.order[1]),
      new Filters.InFilter(params.inFilter[0], params.inFilter[1] as unknown as string[]),
    ]);
  });
});

describe("getDeliveryUrlParams", () => {
  it("should return correct deliver url parameters for last cli param", () => {
    const last = 10;

    const parameters = getDeliveryUrlParams({ language: "default", last, limit: last });

    expect(parameters).toStrictEqual([
      new Parameters.DepthParameter(0),
      new Parameters.LanguageParameter("default"),
      new Parameters.LimitParameter(last),
      new Parameters.OrderParameter("system.last_modified", "desc"),
    ]);
  });

  it("should return correct deliver url parameters for byTypeCodenames cli param", () => {
    const byTypesCodenames = ["type1", "type2"];

    const parameters = getDeliveryUrlParams({
      language: "default",
      limit: 100,
      byTypesCodenames,
    });

    expect(parameters).toStrictEqual([
      new Parameters.DepthParameter(0),
      new Parameters.LanguageParameter("default"),
      new Parameters.LimitParameter(100),
      new Filters.InFilter("system.type", byTypesCodenames),
    ]);
  });

  it("should return correct deliver url parameters for items cli param", () => {
    const items = ["item1", "item2"];

    const parameters = getDeliveryUrlParams({
      language: "default",
      limit: 100,
      depth: 0,
      items,
    });

    expect(parameters).toStrictEqual([
      new Parameters.DepthParameter(0),
      new Parameters.LanguageParameter("default"),
      new Parameters.LimitParameter(100),
      new Filters.InFilter("system.codename", items),
    ]);
  });

  it("should return correct deliver url parameters for custom filter", () => {
    const filter = "system.codename=123";

    const parameters = getDeliveryUrlParams({ language: "default", limit: 100, filter });

    expect(parameters).toStrictEqual([
      new Parameters.DepthParameter(0),
      new Parameters.LanguageParameter("default"),
      new Parameters.LimitParameter(100),
      new Parameters.CustomParameter(filter),
    ]);
  });
});

const defaultItemProps = {
  id: "-",
  name: "",
  type: "-",
  lastModified: "",
  language: "",
  sitemapLocations: [],
  workflow: "",
  workflowStep: "",
  collection: "",
};

describe("extractItemsCodenamesFromResponse", () => {
  it("should return correctly items codenames", () => {
    const data: Responses.IListContentItemsResponse<IContentItem<IContentItemElements>> = {
      items: [
        {
          system: { ...defaultItemProps, codename: "item1" },
          elements: {},
        },
        {
          system: { ...defaultItemProps, codename: "item2" },
          elements: {},
        },
      ],
      pagination: { skip: 0, limit: 0, count: 0, nextPage: "", totalCount: 0 },
      linkedItems: {
        item2: {
          system: { ...defaultItemProps, codename: "item2", workflow: "test_workflow" },
          elements: {},
        },
        item3: {
          system: { ...defaultItemProps, codename: "item3", workflow: "test_workflow" },
          elements: {},
        },
        item4: {
          system: { ...defaultItemProps, codename: "item4" },
          elements: {},
        },
      },
    };

    const result = extractItemsCodenamesFromResponse(data);

    expect(result).toEqual(new Set(["item1", "item2", "item3"]));
  });
});
