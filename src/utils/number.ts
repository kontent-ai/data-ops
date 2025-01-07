/**
 * Pads a given positive number with leading zeros up to the specified length.
 *
 * @param {number} num - The positive number to pad. Must be greater than or equal to 0.
 * @param {number | undefined} numberOfZeros - The total length of the resulting string, including leading zeros. If undefined, the number is returned as is.
 * @returns {string} The number as a string, padded with leading zeros if specified.
 */
export const padWithLeadingZeros = (num: number, numberOfZeros: number | undefined): string =>
  numberOfZeros
    ? num.toString().padStart(numberOfZeros, "0")
    : num.toString();
