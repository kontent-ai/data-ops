export enum DateLevel {
  Year = 0,
  Month = 1,
  Day = 2,
  Hour = 3,
  Minute = 4,
  Second = 5,
}

export const serializeDateForFileName = (date: Date, level: DateLevel) =>
  [
    date.getUTCFullYear(),
    ...level >= DateLevel.Month ? [("0" + (date.getUTCMonth() + 1)).slice(-2)] : [],
    ...level >= DateLevel.Day ? [("0" + date.getUTCDate()).slice(-2)] : [],
    ...level >= DateLevel.Hour ? [("0" + date.getUTCHours()).slice(-2)] : [],
    ...level >= DateLevel.Minute ? [("0" + date.getUTCMinutes()).slice(-2)] : [],
    ...level >= DateLevel.Second ? [("0" + date.getUTCSeconds()).slice(-2)] : [],
  ].join("-");
