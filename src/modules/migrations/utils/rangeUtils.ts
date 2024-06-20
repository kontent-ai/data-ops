import { Range } from "../models/migration.js";
import { MigrationOrder } from "../models/status.js";
import { ErrorLike, isErr } from "../types/err.js";
import { orderComparator } from "./orderUtils.js";

export const parseRange = (range: string): ErrorLike<Range> => {
  const splittedRange = range.split(":");
  const [from, to] = splittedRange;

  if (from === undefined || to === undefined || splittedRange.length !== 2) {
    return { err: "Bad range format" };
  }

  const parsedFrom = parseRangeOption(from) ?? 0;
  if (isErr(parsedFrom)) {
    return parsedFrom;
  }

  const parsedTo = parseRangeOption(to) ?? new Date("9999-12-31");
  if (isErr(parsedTo)) {
    return parsedTo;
  }

  return {
    from: parsedFrom,
    to: parsedTo,
  };
};

const parseRangeOption = (option: string): ErrorLike<MigrationOrder | null> => {
  if (option === "") {
    return null;
  }
  const dateMatch = option.match(/^T(?<date>\d{4}((-\d{2}){0,2}))(?:-(?<time>(\d{2}-){0,2}\d{2}))?/);
  if (dateMatch?.[0] === option) {
    const [hours, minutes, seconds] = (dateMatch.groups?.time?.replaceAll("-", ":") ?? "00:00:00").split(":");

    const time = `${hours ?? "00"}:${minutes ?? "00"}:${seconds ?? "00"}`;
    const date = new Date(`${dateMatch.groups?.date}T${time}Z`);

    return !isNaN(date.valueOf()) ? date : { err: `${option} is invalid Date.` };
  }
  if (!isNaN(Number(option))) {
    return Number(option);
  }
  return { err: `${option} is not a valid order format.` };
};

export const validateRange = (range: Range) => {
  if (typeof range.from === "number" && range.from < 0 || typeof range.to === "number" && range.to <= 0) {
    return { error: "Order must be grater or equal 0" };
  }

  return orderComparator(range.from, range.to) <= 0
    ? range
    : { error: "Left sight of range can't be bigger than right side!" };
};
