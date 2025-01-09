import { readFile, writeFile, unlink } from "node:fs/promises";
import { type Buffer } from "node:buffer";
import { execSync } from "node:child_process";
import { bin } from "./utils.js";

export async function convertToPdf(file: Buffer, extension: string): Promise<Buffer> {
  if (!["png", "jpg", "jpeg"].includes(extension.toLowerCase()))
    return Promise.reject("Invalid extension");

  const outputPath = "/tmp/output.pdf";
  const inputPath = `/tmp/input.${extension}`;
  try {
    await writeFile(inputPath, file, "binary");
    const args = [
      inputPath,
      "-quality 81",
      extension === "png" ? ["-strip", "-layers flatten"].join(" ") : "",
    ];

    execSync(`${bin.convert} ${args.join(" ")} ${outputPath}`);

    return await readFile(outputPath);
  } finally {
    await Promise.all(
      [inputPath, outputPath].map(async (file) => {
        await unlink(file);
      })
    );
  }
}
