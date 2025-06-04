import { expect } from "vitest";

import { runCommand } from "./runCommand.ts";

export const expectHelpText = async (output: string, forCommand = "") => {
  const helpText = await runCommand(`${forCommand} -h`).then((res) => res.stdout);

  expect(output).toContain(helpText);
};
