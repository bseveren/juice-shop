function runService(name, path) {
    console.log("Starting service " + name + "...");
    exec("cd " + path + " && go run *.go", (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(stdout);
    });
}
