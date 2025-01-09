import path from "path";
import { fileURLToPath } from "url";

const UP_PATH_REGEXP = /(?:^|[\\/])\.\.(?:[\\/]|$)/;
const __filename = fileURLToPath(import.meta.url);
const defaultRoot = path.join(path.dirname(__filename), "files");

export function resolveFile(file, root = defaultRoot) {
  file = path.normalize("." + path.sep + file);

  if (UP_PATH_REGEXP.test(file)) {
    return;
  }

  return path.normalize(path.join(root, file));
}
