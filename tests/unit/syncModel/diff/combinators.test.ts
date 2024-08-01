import { describe, expect, it, jest } from "@jest/globals";

import {
  baseHandler,
  constantHandler,
  Handler,
  makeAdjustEntityHandler,
  makeAdjustOperationHandler,
  makeArrayHandler,
  makeBaseArrayHandler,
  makeLeafObjectHandler,
  makeObjectHandler,
  makeOrderingHandler,
  makePrefixHandler,
  makeProvideHandler,
  makeUnionHandler,
  optionalHandler,
} from "../../../../src/modules/sync/diff/combinators.ts";
import { PatchOperation } from "../../../../src/modules/sync/types/patchOperation.ts";

describe("makeObjectHandler", () => {
  it("concatenates results of all property handlers and prepends property names to paths", () => {
    type TestedType = Readonly<{ a: number; b: boolean; c: string }>;
    const source: TestedType = {
      a: 69,
      b: true,
      c: "abc",
    };
    const target: TestedType = {
      a: 33,
      b: false,
      c: "hm",
    };

    const result = makeObjectHandler<TestedType>({
      a: (s, t) => [{ op: "replace", path: "/test", value: s, oldValue: t }],
      b: (s) => [{ op: "addInto", path: "/test/a", value: s }],
      c: (s, t) => [{ op: "remove", path: `/test/${s}/${t}`, oldValue: t }],
    })(source, target);

    expect(result).toStrictEqual([
      { op: "replace", path: "/a/test", value: 69, oldValue: 33 },
      { op: "addInto", path: "/b/test/a", value: true },
      { op: "remove", path: "/c/test/abc/hm", oldValue: "hm" },
    ]);
  });

  it("provides context of the whole object to contextful handlers", () => {
    type TestedType = Readonly<{ a: string; b: number }>;
    const source: TestedType = {
      a: "abc",
      b: 69,
    };
    const target: TestedType = {
      a: "xyz",
      b: 11,
    };

    const result = makeObjectHandler<TestedType>({
      a: {
        contextfulHandler:
          ({ source, target }) => (s, t) => [{ op: "replace", path: `/${s}/${t}`, value: source, oldValue: target }],
      },
      b: () => [],
    })(source, target);

    expect(result).toStrictEqual([
      {
        op: "replace",
        path: "/a/abc/xyz",
        value: { a: "abc", b: 69 },
        oldValue: { a: "xyz", b: 11 },
      },
    ]);
  });
});

describe("makeLeafObjectHandler", () => {
  it("Replaces the whole object when one of the properties changed", () => {
    type TestedType = Readonly<{ a: string; b: number }>;
    const source: TestedType = {
      a: "abc",
      b: 42,
    };
    const target: TestedType = {
      a: "ccc",
      b: 42,
    };

    const result = makeLeafObjectHandler<TestedType>({})(source, target);

    expect(result).toStrictEqual([
      { op: "replace", path: "", value: source, oldValue: target },
    ]);
  });

  it("Leverages provided comparers to compare properties", () => {
    type TestedType = Readonly<{ a: string; b: number }>;
    const source: TestedType = {
      a: "abc",
      b: 42,
    };
    const target: TestedType = source;

    const result = makeLeafObjectHandler<TestedType>({
      a: () => false,
    })(source, target);

    expect(result).toStrictEqual([
      { op: "replace", path: "", value: source, oldValue: target },
    ]);
  });

  it("Doesn't create any operations for the same objects", () => {
    type TestedType = Readonly<{ a: number }>;
    const source: TestedType = { a: 42 };
    const target = source;

    const result = makeLeafObjectHandler<TestedType>({})(source, target);

    expect(result).toStrictEqual([]);
  });

  it("Applies provided transform function on source before passing it to the resulting operation", () => {
    type TestedType = Readonly<{ a: string }>;
    const source: TestedType = { a: "aaa" };
    const target: TestedType = { a: "bbb" };

    const result = makeLeafObjectHandler<TestedType>({}, s => ({ ...s, b: 42 }))(source, target);

    expect(result).toStrictEqual([
      { op: "replace", path: "", value: { a: "aaa", b: 42 }, oldValue: target },
    ]);
  });
});

describe("makeArrayHandler", () => {
  it("Return empty array when source and target are only different in order", () => {
    type TestedElement = Readonly<{ a: string }>;
    const source: ReadonlyArray<TestedElement> = [{ a: "first" }, { a: "second" }, { a: "third" }];
    const target: ReadonlyArray<TestedElement> = [{ a: "third" }, { a: "first" }, { a: "second" }];

    const result = makeArrayHandler<TestedElement>(el => el.a, () => [])(source, target);

    expect(result).toStrictEqual([]);
  });

  it("Creates update operations", () => {
    type TestedElement = Readonly<{ a: string; b: number }>;
    const source: ReadonlyArray<TestedElement> = [{ a: "first", b: 42 }, { a: "second", b: 69 }, { a: "third", b: 32 }];
    const target: ReadonlyArray<TestedElement> = [{ a: "second", b: 32 }, { a: "first", b: 42 }, { a: "third", b: 69 }];

    const result = makeArrayHandler<TestedElement>(
      el => el.a,
      (s, t) => s.b !== t.b ? [{ op: "replace", path: "/test", value: s, oldValue: t }] : [],
    )(source, target);

    expect(result).toStrictEqual([
      {
        op: "replace",
        path: "/codename:second/test",
        value: { a: "second", b: 69 },
        oldValue: { a: "second", b: 32 },
      },
      {
        op: "replace",
        path: "/codename:third/test",
        value: { a: "third", b: 32 },
        oldValue: { a: "third", b: 69 },
      },
    ]);
  });

  it("Creates remove operations for removed elements", () => {
    type TestedElement = Readonly<{ a: string }>;
    const source: ReadonlyArray<TestedElement> = [{ a: "first" }, { a: "second" }];
    const target: ReadonlyArray<TestedElement> = [{ a: "second" }, { a: "toDelete" }, { a: "first" }];

    const result = makeArrayHandler<TestedElement>(
      el => el.a,
      () => [],
    )(source, target);

    expect(result).toStrictEqual([
      {
        op: "remove",
        path: "/codename:toDelete",
        oldValue: { a: "toDelete" },
      },
    ]);
  });

  it("Creates add operations with proper position argument", () => {
    type TestedElement = Readonly<{ a: string }>;
    const source: ReadonlyArray<TestedElement> = [
      { a: "newFirst" },
      { a: "first" },
      { a: "newSecond" },
      { a: "second" },
    ];
    const target: ReadonlyArray<TestedElement> = [{ a: "first" }, { a: "second" }];

    const result = makeArrayHandler<TestedElement>(
      el => el.a,
      () => [],
    )(source, target);

    expect(result).toStrictEqual([
      {
        op: "addInto",
        path: "",
        value: { a: "newFirst" },
      },
      {
        op: "addInto",
        path: "",
        value: { a: "newSecond" },
      },
    ]);
  });

  it("Transforms values for addInto operations when the transformer is provided", () => {
    type TestedElement = Readonly<{ a: string; b: number }>;
    const source: ReadonlyArray<TestedElement> = [{ a: "1", b: 1 }, { a: "2", b: 2 }];
    const target: ReadonlyArray<TestedElement> = [];

    const result = makeArrayHandler<TestedElement>(el => el.a, () => [], el => ({ ...el, b: el.b * 2 }))(
      source,
      target,
    );

    expect(result).toStrictEqual([
      {
        op: "addInto",
        path: "",
        value: { a: "1", b: 2 },
      },
      {
        op: "addInto",
        path: "",
        value: { a: "2", b: 4 },
      },
    ]);
  });
});

describe("makeBaseArrayHandler", () => {
  it("Create same ops as makeArrayHandler, but without the 'codename:' prefix", () => {
    type TestedElement = Readonly<{ a: string; b: number }>;
    const source: ReadonlyArray<TestedElement> = [{ a: "1", b: 1 }, { a: "2", b: 2 }];
    const target: ReadonlyArray<TestedElement> = [{ a: "1", b: 2 }, { a: "3", b: 2 }];

    const result = makeBaseArrayHandler<TestedElement>(
      e => e.a,
      (e1, e2) => e1.b === e2.b ? [] : [{ op: "replace", path: "/b", value: e1.b, oldValue: e2.b }],
      el => ({ ...el, b: 666 }),
    )(source, target);

    expect(result).toStrictEqual([
      { op: "replace", path: "/1/b", value: 1, oldValue: 2 },
      { op: "addInto", path: "", value: { a: "2", b: 666 } },
      { op: "remove", path: "/3", oldValue: { a: "3", b: 2 } },
    ]);
  });
});

describe("makeAdjustOperationHandler", () => {
  it("Adjust operation is called on the result of the provided handler", () => {
    const source = "testSource";
    const target = "testTarget";

    const handler: Handler<string> = (source, target) => [
      { op: "replace", path: "/test", oldValue: target, value: source },
    ];

    const result = makeAdjustOperationHandler<string>(
      (ops) => ops.map(op => ({ ...op, path: "/newTest" })),
      handler,
    )(source, target);

    expect(result).toStrictEqual([
      { op: "replace", path: "/newTest", oldValue: target, value: source },
    ]);
  });
});

describe("makeAdjustEntityHandler", () => {
  it("Adjusts entities and pass them to the handler", () => {
    const adjustEntity = (entity: number) => entity.toString() + " adjusted";
    const handler: Handler<string> = (s, t) => [{ op: "replace", path: "", value: s, oldValue: t }];

    const result = makeAdjustEntityHandler<number, string>(adjustEntity, handler)(42, 69);

    expect(result).toStrictEqual([{ op: "replace", path: "", value: "42 adjusted", oldValue: "69 adjusted" }]);
  });
});

describe("makeProvideHandler", () => {
  it("Provides the same source and target to makeHandler param and the returned handler", () => {
    const handler: Handler<number> = (s, t) => [{ op: "replace", path: "", value: s, oldValue: t }];
    const handlerMaker = jest.fn(() => handler);

    const result = makeProvideHandler<number>(handlerMaker)(42, 69);

    expect(handlerMaker).toHaveBeenCalledTimes(1);
    expect(handlerMaker).toHaveBeenCalledWith(42, 69);
    expect(result).toStrictEqual([{ op: "replace", path: "", value: 42, oldValue: 69 }]);
  });
});

describe("makeOrderingHandler", () => {
  const createMoveOp = (codename: string, afterCodename: string) => ({
    op: "move",
    path: `/codename:${codename}`,
    after: {
      codename: afterCodename,
    },
  });

  it("returns empty array for same source and target order", () => {
    const source = ["a", "b", "c"];
    const target = ["a", "b", "c"];

    const result = makeOrderingHandler<string>(() => [], entity => entity)(source, target);

    expect(result).toStrictEqual([]);
  });

  it("returns move ops array for different source and target order", () => {
    const source = ["a", "b", "c"];
    const target = ["b", "a", "c"];

    const result = makeOrderingHandler<string>(() => [], entity => entity)(source, target);

    expect(result).toStrictEqual([createMoveOp("b", "a"), createMoveOp("c", "b")]);
  });

  type TestType = { codename: string; content_group: string };

  it("returns move ops grouped by groupBy array for different source and target order", () => {
    const source: TestType[] = [
      { codename: "a", content_group: "1" },
      { codename: "e", content_group: "3" },
      { codename: "b", content_group: "1" },
      { codename: "c", content_group: "2" },
      { codename: "d", content_group: "2" },
    ];
    const target: TestType[] = [
      { codename: "b", content_group: "1" },
      { codename: "a", content_group: "1" },
      { codename: "e", content_group: "3" },
      { codename: "d", content_group: "2" },
      { codename: "c", content_group: "2" },
    ];

    const result = makeOrderingHandler<TestType>(() => [], entity => entity.codename, {
      groupBy: entity => entity.content_group,
    })(
      source,
      target,
    );

    expect(result).toStrictEqual([createMoveOp("b", "a"), createMoveOp("d", "c")]);
  });

  it("returns empty array grouped by groupBy array for same source and target order but different order due to content groups", () => {
    const source: TestType[] = [
      { codename: "c", content_group: "2" },
      { codename: "a", content_group: "1" },
      { codename: "b", content_group: "1" },
    ];
    const target: TestType[] = [
      { codename: "a", content_group: "1" },
      { codename: "b", content_group: "1" },
      { codename: "c", content_group: "2" },
    ];

    const result = makeOrderingHandler<TestType>(() => [], entity => entity.codename, {
      groupBy: entity => entity.content_group,
    })(
      source,
      target,
    );

    expect(result).toStrictEqual([]);
  });

  it("does not return move op using removed element for different source and target order", () => {
    const source = ["a", "b"];
    const target = ["a", "c", "b"];

    const removeOp = { op: "remove", path: "/codename:c", oldValue: "c" } as const;

    const result = makeOrderingHandler<string>(
      () => [removeOp],
      x => x,
    )(source, target);

    expect(result).toStrictEqual([removeOp]);
  });

  it("does not return move op using removed element for different source and target order", () => {
    const source = ["a", "b"];
    const target = ["b", "c", "a"];

    const removeOp = { op: "remove", path: "/codename:c", oldValue: "c" } as const;

    const result = makeOrderingHandler<string>(
      () => [removeOp],
      x => x,
    )(source, target);

    expect(result).toStrictEqual([removeOp, createMoveOp("b", "a")]);
  });

  it("should only consider elements that pass the filter function", () => {
    const source = ["a", "b", "c"];
    const target = ["c", "b"];

    const result = makeOrderingHandler<string>(() => [], el => el, { filter: el => el !== "a" })(
      source,
      target,
    );

    expect(result).toStrictEqual([
      createMoveOp("c", "b"),
    ]);
  });

  it("should return empty array when there is only one entity after filtering", () => {
    const source = ["a", "b", "c"];
    const target = ["c", "b"];

    const result = makeOrderingHandler<string>(() => [], el => el, { filter: el => el === "b" })(
      source,
      target,
    );

    expect(result).toStrictEqual([]);
  });
});

describe("optionalHandler", () => {
  const timesTwoHandler: Handler<number> = (s, t) =>
    s === t ? [] : [{ op: "replace", path: "", value: s * 2, oldValue: t * 2 }];

  it("Returns empty array when source and target are undefined", () => {
    type TestedType = number | undefined;
    const source: TestedType = undefined;
    const target: TestedType = undefined;

    const result = optionalHandler(timesTwoHandler)(source, target);

    expect(result).toStrictEqual([]);
  });

  it("Replaces target with null when only source is undefined", () => {
    type TestedType = number | undefined;
    const source: TestedType = undefined;
    const target: TestedType = 42;

    const result = optionalHandler(timesTwoHandler)(source, target);

    expect(result).toStrictEqual([{ op: "replace", path: "", value: null, oldValue: 42 }]);
  });

  it("Replaces target when only target is undefined", () => {
    type TestedType = number | undefined;
    const source: TestedType = 42;
    const target: TestedType = undefined;

    const result = optionalHandler(timesTwoHandler)(source, target);

    expect(result).toStrictEqual([{ op: "replace", path: "", value: 42, oldValue: null }]);
  });

  it("Returns inner handler result when both are defined", () => {
    type TestedType = number | undefined;
    const source: TestedType = 42;
    const target: TestedType = 86;

    const result = optionalHandler(timesTwoHandler)(source, target);

    expect(result).toStrictEqual([{ op: "replace", path: "", value: 42 * 2, oldValue: 86 * 2 }]);
  });
});

describe("baseHandler", () => {
  it("Replaces target when source and target are different", () => {
    const source: number = 42;
    const target: number = 98;

    const result = baseHandler(source, target);

    expect(result).toStrictEqual([{ op: "replace", path: "", value: 42, oldValue: 98 }]);
  });

  it("Returns an empty array when source and target are the same", () => {
    const result = baseHandler(42, 42);

    expect(result).toStrictEqual([]);
  });
});

describe("constantHandler", () => {
  it("Returns an empty array for any values", () => {
    const entries: [unknown, unknown][] = [[4, 4], [4, 2], ["r", "g"], [3, "j"], [{ a: 8 }, { b: "f" }], [[], [9]]];

    const result = entries.flatMap(([s, t]) => constantHandler(s, t));

    expect(result).toStrictEqual([]);
  });
});

describe("makeUnionHandler", () => {
  it("Replaces the whole object when the discriminator is different in source and target", () => {
    type TestedType = { a: "num"; b: number } | { a: "str"; b: string };
    const source: TestedType = { a: "num", b: 42 };
    const target: TestedType = { a: "str", b: "42" };

    const result = makeUnionHandler<"a", TestedType>("a", { num: () => [], str: () => [] })(
      source,
      target,
    );

    expect(result).toStrictEqual([
      {
        op: "replace",
        path: "",
        value: source,
        oldValue: target,
      },
    ]);
  });

  it("Uses handler based on discriminator", () => {
    type TestedType = { a: "num"; b: number } | { a: "str"; b: string };
    const source: TestedType = { a: "num", b: 42 };
    const target: TestedType = { a: "num", b: 88 };

    const result = makeUnionHandler<"a", TestedType>("a", {
      num: () => [{ op: "remove", path: "here", oldValue: "test" }],
      str: () => [{ op: "addInto", path: "notHere", value: "notThis" }],
    })(
      source,
      target,
    );

    expect(result).toStrictEqual([
      {
        op: "remove",
        path: "here",
        oldValue: "test",
      },
    ]);
  });
});

describe("makePrefixHandler", () => {
  it("Adds the specified prefix to path", () => {
    const ops: ReadonlyArray<PatchOperation> = [
      { op: "remove", path: "/somePath", oldValue: 666 },
      { op: "move", path: "/movePath", after: { codename: "cd" } },
      { op: "addInto", path: "/addPath", value: 99 },
      { op: "replace", path: "/replacePath/prop", value: 77, oldValue: 33 },
    ];

    const result = makePrefixHandler("test:", () => true, () => ops)(42, 44);

    expect(result).toStrictEqual([
      { op: "remove", path: "/test:somePath", oldValue: 666 },
      { op: "move", path: "/test:movePath", after: { codename: "cd" } },
      { op: "addInto", path: "/test:addPath", value: 99 },
      { op: "replace", path: "/test:replacePath/prop", value: 77, oldValue: 33 },
    ]);
  });
  it("Adds the specified prefix only where it should be added", () => {
    const ops: ReadonlyArray<PatchOperation> = [
      { op: "remove", path: "/toDelete", oldValue: 666 },
      { op: "move", path: "/toDelete", after: { codename: "cd" } },
      { op: "addInto", path: "/addPath", value: 99 },
    ];

    const result = makePrefixHandler("test:", op => op.path !== "/toDelete", () => ops)(42, 44);

    expect(result).toStrictEqual([
      { op: "remove", path: "/toDelete", oldValue: 666 },
      { op: "move", path: "/toDelete", after: { codename: "cd" } },
      { op: "addInto", path: "/test:addPath", value: 99 },
    ]);
  });
});
