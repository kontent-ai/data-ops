export const serializeDateForFileName = (date: Date) =>
  `${date.getUTCFullYear()}-${
    date.getUTCMonth() + 1
  }-${date.getUTCDate()}-${date.getUTCHours()}-${date.getUTCMinutes()}`;
