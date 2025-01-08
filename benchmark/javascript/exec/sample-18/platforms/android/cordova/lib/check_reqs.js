function tryCommand(cmd, errMsg, catchStderr) {
    var d = Q.defer();
    child_process.exec(cmd, function(err, stdout, stderr) {
        if (err) d.reject(new CordovaError(errMsg));
        // Sometimes it is necessary to return an stderr instead of stdout in case of success, since
        // some commands prints theirs output to stderr instead of stdout. 'javac' is the example
        else d.resolve((catchStderr ? stderr : stdout).trim());
    });
    return d.promise;
}

module.exports.check_ant = function() {
    return tryCommand('ant -version', 'Failed to run "ant -version", make sure you have ant installed and added to your PATH.')
    .then(function (output) {
        // Parse Ant version from command output
        return /version ((?:\d+\.)+(?:\d+))/i.exec(output)[1];
    });
};
