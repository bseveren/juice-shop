import { exec } from "node:child_process";
import path from "node:path";

const binariesPath = "/usr/bin";

export default class Service {
  public static async storeToken(token: string): Promise<void> {
    const serviceBinary = path.join(binariesPath, "serv");

    return new Promise((resolve, reject) => {
      exec(`"${serviceBinary}" token ${token}`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}
