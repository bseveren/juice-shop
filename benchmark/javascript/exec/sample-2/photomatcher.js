import path from "node:path";

export function callPhotomatcher(root, source, target) {
  const rootPath = `${path.resolve(root)}/`;
  const output = `/tmp/pm-${Math.random().toString().slice(-8)}.csv`;

  const cmd = `pm --root ${rootPath} --source ${source} --target ${target} --output ${output}`;
  const cmdSplit = cmd.split(" ");

  return new Promise((resolve, reject) => {
    const child = spawn(cmdSplit[0], cmdSplit.slice(1));
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    child.on("exit", () => {
      return parseCsvFile(output)
        .then((matches) => resolve(matches))
        .catch((err) => reject(err));
    });
  });
}
