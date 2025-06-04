import { padWithLeadingZeros } from "./number.js";

export enum DateLevel {
  Year = 0,
  Month = 1,
  Day = 2,
  Hour = 3,
  Minute = 4,
  Second = 5,
}

export const serializeDateForFileName = (date: Date, level: DateLevel) =>
  createDateParts(date)
    .slice(0, level + 1)
    .join("-");

const createDateParts = (date: Date) =>
  Object.values({
    [DateLevel.Year]: date.getUTCFullYear().toString(),
    [DateLevel.Month]: padWithLeadingZeros(date.getUTCMonth() + 1, 2),
    [DateLevel.Day]: padWithLeadingZeros(date.getUTCDate(), 2),
    [DateLevel.Hour]: padWithLeadingZeros(date.getUTCHours(), 2),
    [DateLevel.Minute]: padWithLeadingZeros(date.getUTCMinutes(), 2),
    [DateLevel.Second]: padWithLeadingZeros(date.getUTCSeconds(), 2),
  } as const satisfies Record<DateLevel, string>);
