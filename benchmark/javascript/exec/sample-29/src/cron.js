const cron = require("node-cron");
const spawn = require("child_process").spawn;
const FgReset = "\x1b[0m";
const FgYellow = "\x1b[33m";

// executeOneShellCommand('node D:\\Users\\crawler.admin\\Human\\cron\\hi.js')

cron.schedule("59 23 * * *", function () {
    executeOneShellCommand("node app.js --plugins=false --output=sf");
});

function executeOneShellCommand(cmdString) {
    let commandArguments = cmdString.split(" ");

    let shellCommand = commandArguments.shift();

    console.log(FgYellow, "Executing " + cmdString + "...", FgReset);

    let returnObj = {};
    let stdOut = [];
    let stdErr = [];

    return new Promise((resolve, reject) => {
        try {
            let shellCmd = spawn(shellCommand, commandArguments, {
                timeout: 60000,
            });

            shellCmd.stdout.on("data", function (data) {
                // console.log('stdout for ' + shellCommand + ":" + data.toString());
                console.log(data.toString());
                stdOut.push(data);
            });

            shellCmd.stderr.on("data", function (data) {
                console.log(
                    "stdErr for " + shellCommand + ":" + data.toString()
                );
                stdErr.push(data.toString());
            });

            shellCmd.on("exit", function (code) {
                // console.log("clearTimeout->" + killShellCmdTimeOut);
                // clearTimeout(killShellCmdTimeOut);
                console.log(
                    "child process " +
                        shellCommand +
                        " " +
                        commandArguments +
                        " exited with code " +
                        (code ? code.toString() : "")
                );
                returnObj.exitCode = code;
                returnObj.stdOut = stdOut;

                //TODO this is not working. stdErr is not available.
                returnObj.stdErr = stdErr;
                resolve(returnObj);
            });
        } catch (error) {
            console.log("executeOneShellCommand() error->" + error.stack);
            returnObj.success = false;
            returnObj.stdErr = stdErr;
            returnObj.exitCode = -1;
            resolve(returnObj);
        }
    });
}
