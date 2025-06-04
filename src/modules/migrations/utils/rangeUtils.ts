import type { MigrationOrder, Range } from "../models/migration.js";
import type { WithErr } from "./errUtils.js";
import { orderComparator } from "./orderUtils.js";

export const parseRange = (range: string): WithErr<Range> => {
  const splittedRange = range.split(":");
  const [from, to] = splittedRange;

  if (from === undefined || to === undefined || splittedRange.length !== 2) {
    return { err: "Bad range format" };
  }

  const parsedFrom = parseRangeOption(from);
  if ("err" in parsedFrom) {
    return parsedFrom;
  }

  const parsedTo = parseRangeOption(to);
  if ("err" in parsedTo) {
    return parsedTo;
  }

  return {
    value: {
      from: parsedFrom.value ?? 0,
      to: parsedTo.value ?? new Date("9999-12-31"),
    },
  };
};

const parseRangeOption = (option: string): WithErr<MigrationOrder | null> => {
  if (option === "") {
    return { value: null };
  }
  const dateMatch = option.match(
    /^T(?<date>\d{4}((-\d{2}){0,2}))(?:-(?<time>(\d{2}-){0,2}\d{2}))?/,
  );
  if (dateMatch?.[0] === option) {
    const [hours, minutes, seconds] = (
      dateMatch.groups?.time?.replaceAll("-", ":") ?? "00:00:00"
    ).split(":");

    const time = `${hours ?? "00"}:${minutes ?? "00"}:${seconds ?? "00"}`;
    const date = new Date(`${dateMatch.groups?.date}T${time}Z`);

    return !Number.isNaN(date.valueOf()) ? { value: date } : { err: `${option} is invalid Date.` };
  }
  if (!Number.isNaN(Number(option))) {
    return { value: Number(option) };
  }
  return { err: `${option} is not a valid order format.` };
};

export const validateRange = (range: Range) => {
  if (
    (typeof range.from === "number" && range.from < 0) ||
    (typeof range.to === "number" && range.to <= 0)
  ) {
    return { err: "Order must be greater or equal 0" };
  }

  return orderComparator(range.from, range.to) <= 0
    ? range
    : { err: "Left side of range can't be bigger than right side!" };
};
