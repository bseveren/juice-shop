export function runCommand(cmd: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
            if (stdout !== undefined) {
                resolve(stdout);
            } else if (stderr !== undefined) {
                reject(new Error(stderr));
            } else if (err) {
                reject(err);
            } else {
                reject(new Error('unknown'));
            }
        });
    });
}
