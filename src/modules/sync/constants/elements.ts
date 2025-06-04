import type { ElementsTypes } from "../types/contractModels.js";

const elementTypesObj: { [key in ElementsTypes]: null } = {
  asset: null,
  number: null,
  snippet: null,
  custom: null,
  date_time: null,
  modular_content: null,
  guidelines: null,
  subpages: null,
  multiple_choice: null,
  rich_text: null,
  taxonomy: null,
  text: null,
  url_slug: null,
};

export const elementTypes = new Set(Object.keys(elementTypesObj));
