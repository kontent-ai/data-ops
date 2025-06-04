import * as childProcess from "node:child_process";

export const runCommand = (command: string): Promise<CommandResult> => {
  return new Promise((resolve, reject: (err: CommandError) => void) => {
    childProcess.exec(`node ./build/src/index.js ${command}`, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      }

      resolve({ stdout, stderr });
    });
  });
};

export type CommandError = Readonly<{
  error: childProcess.ExecException | null;
  stdout: string;
  stderr: string;
}>;

type CommandResult = Readonly<{
  stdout: string;
  stderr: string;
}>;
