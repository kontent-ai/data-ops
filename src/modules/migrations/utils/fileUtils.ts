import fs from "node:fs";

import type { WithErr } from "./errUtils.js";

export const createFolder = (folderPath: string): WithErr<string> => {
  try {
    fs.mkdirSync(folderPath, { recursive: true });
  } catch (e) {
    return {
      err: `Couldn't create folder ${folderPath}. ${e instanceof Error ? e.message : "Unknown error occurred."}`,
    };
  }

  return { value: folderPath };
};

export const saveFile = (path: string, data: string): WithErr<string> => {
  try {
    fs.writeFileSync(path, data);
  } catch (e) {
    return {
      err: `Couldn't save the file ${path}. ${e instanceof Error ? e.message : "Unknown error occurred."}`,
    };
  }

  return { value: path };
};
