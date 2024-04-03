import { describe, expect, it } from "@jest/globals";

import {
  baseHandler,
  constantHandler,
  Handler,
  makeArrayHandler,
  makeLeafObjectHandler,
  makeObjectHandler,
  makeUnionHandler,
  optionalHandler,
} from "../../../../src/modules/sync/diff/combinators";

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
  it("Creates move operations to sort target based on source elements' codenames", () => {
    type TestedElement = Readonly<{ a: string }>;
    const source: ReadonlyArray<TestedElement> = [{ a: "first" }, { a: "second" }, { a: "third" }];
    const target: ReadonlyArray<TestedElement> = [{ a: "third" }, { a: "first" }, { a: "second" }];

    const result = makeArrayHandler<TestedElement>(el => el.a, () => [])(source, target);

    expect(result).toStrictEqual([
      {
        op: "move",
        path: "/codename:first",
        before: { codename: "third" },
      },
      {
        op: "move",
        path: "/codename:second",
        after: { codename: "first" },
      },
      {
        op: "move",
        path: "/codename:third",
        after: { codename: "second" },
      },
    ]);
  });

  it("Creates update operations along with move operations when needed", () => {
    type TestedElement = Readonly<{ a: string; b: number }>;
    const source: ReadonlyArray<TestedElement> = [{ a: "first", b: 42 }, { a: "second", b: 69 }];
    const target: ReadonlyArray<TestedElement> = [{ a: "second", b: 32 }, { a: "first", b: 42 }];

    const result = makeArrayHandler<TestedElement>(
      el => el.a,
      (s, t) => s.b !== t.b ? [{ op: "replace", path: "/test", value: s, oldValue: t }] : [],
    )(source, target);

    expect(result).toStrictEqual([
      {
        op: "move",
        path: "/codename:first",
        before: { codename: "second" },
      },
      {
        op: "move",
        path: "/codename:second",
        after: { codename: "first" },
      },
      {
        op: "replace",
        path: "/codename:second/test",
        value: { a: "second", b: 69 },
        oldValue: { a: "second", b: 32 },
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
        op: "move",
        path: "/codename:first",
        before: { codename: "second" },
      },
      {
        op: "move",
        path: "/codename:second",
        after: { codename: "first" },
      },
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
        before: { codename: "first" },
      },
      {
        op: "move",
        path: "/codename:first",
        after: { codename: "newFirst" },
      },
      {
        op: "addInto",
        path: "",
        value: { a: "newSecond" },
        after: { codename: "first" },
      },
      {
        op: "move",
        path: "/codename:second",
        after: { codename: "newSecond" },
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
        after: { codename: "1" },
      },
    ]);
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

  it("Replaces target when only source is undefined", () => {
    type TestedType = number | undefined;
    const source: TestedType = undefined;
    const target: TestedType = 42;

    const result = optionalHandler(timesTwoHandler)(source, target);

    expect(result).toStrictEqual([{ op: "replace", path: "", value: undefined, oldValue: 42 }]);
  });

  it("Replaces target when only target is undefined", () => {
    type TestedType = number | undefined;
    const source: TestedType = 42;
    const target: TestedType = undefined;

    const result = optionalHandler(timesTwoHandler)(source, target);

    expect(result).toStrictEqual([{ op: "replace", path: "", value: 42, oldValue: undefined }]);
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
