import * as childProcess from "child_process";

export const runCommand = (command: string) => {
  return new Promise((resolve, reject) => {
    childProcess.exec(`node ./build/src/index.js ${command}`, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      }

      resolve({ stdout, stderr });
    });
  });
};
