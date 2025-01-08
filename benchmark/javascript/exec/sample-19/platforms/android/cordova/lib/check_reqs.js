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

module.exports.check_android_target = function(originalError) {
    // valid_target can look like:
    //   android-19
    //   android-L
    //   Google Inc.:Google APIs:20
    //   Google Inc.:Glass Development Kit Preview:20
    var valid_target = module.exports.get_target();
    var msg = 'Android SDK not found. Make sure that it is installed. If it is not at the default location, set the ANDROID_HOME environment variable.';
    return tryCommand('android list targets --compact', msg)
    .then(function(output) {
        var targets = output.split('\n');
        if (targets.indexOf(valid_target) >= 0) {
            return targets;
        }

        var androidCmd = module.exports.getAbsoluteAndroidCmd();
        var msg = 'Please install Android target: "' + valid_target + '".\n\n' +
            'Hint: Open the SDK manager by running: ' + androidCmd + '\n' +
            'You will require:\n' +
            '1. "SDK Platform" for ' + valid_target + '\n' +
            '2. "Android SDK Platform-tools (latest)\n' +
            '3. "Android SDK Build-tools" (latest)';
        if (originalError) {
            msg = originalError + '\n' + msg;
        }
        throw new CordovaError(msg);
    });
};
