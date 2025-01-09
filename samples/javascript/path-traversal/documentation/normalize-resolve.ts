import path from 'node:path';
import { fileURLToPath } from 'url';

console.log(path.normalize("." + path.sep + "../../etc/passwd"));
console.log(path.normalize("./some/folder" + path.sep + "../../etc/passwd"));
console.log(path.normalize("" + path.sep + "../../etc/passwd"));
console.log(path.normalize("/some/folder" + path.sep + "../../etc/passwd"));

console.log(path.resolve("." + path.sep + "../../etc/passwd"));
console.log(path.resolve("./some/folder" + path.sep + "../../etc/passwd"));
console.log(path.resolve("" + path.sep + "../../etc/passwd"));
console.log(path.resolve("/some/folder" + path.sep + "../../etc/passwd"));
