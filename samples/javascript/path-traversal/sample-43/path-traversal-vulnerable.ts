// This code allows attackers to traverse out of the intended directory
// by specifying paths like "../../etc/passwd" in fileName
function readUserFile(fileName: string): string {
    const basePath = "/var/app/data/";
    const filePath = basePath + fileName;

    // Vulnerable: no validation or sanitization
    return fs.readFileSync(filePath, { encoding: "utf-8" });
}
