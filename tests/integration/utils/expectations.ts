import { expect } from "@jest/globals";

import { runCommand } from "./runCommand";

export const expectHelpText = async (output: string) => {
  const helpText = await runCommand("import -h").then(res => res.stdout);

  expect(output).toContain(helpText);
};
