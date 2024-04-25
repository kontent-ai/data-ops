import readline from "node:readline";

export const requestConfirmation = async (message: string) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<boolean>(resolve => {
    rl.question(message, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
};
