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

module.exports.check_java = function() {
    var javacPath = forgivingWhichSync('javac');
    var hasJavaHome = !!process.env['JAVA_HOME'];
    return Q().then(function() {
        if (hasJavaHome) {
            // Windows java installer doesn't add javac to PATH, nor set JAVA_HOME (ugh).
            if (!javacPath) {
                process.env['PATH'] += path.delimiter + path.join(process.env['JAVA_HOME'], 'bin');
            }
        } else {
            if (javacPath) {
                var msg = 'Failed to find \'JAVA_HOME\' environment variable. Try setting setting it manually.';
                // OS X has a command for finding JAVA_HOME.
                if (fs.existsSync('/usr/libexec/java_home')) {
                    return tryCommand('/usr/libexec/java_home', msg)
                    .then(function(stdout) {
                        process.env['JAVA_HOME'] = stdout.trim();
                    });
                } else {
                    // See if we can derive it from javac's location.
                    // fs.realpathSync is require on Ubuntu, which symplinks from /usr/bin -> JDK
                    var maybeJavaHome = path.dirname(path.dirname(javacPath));
                    if (fs.existsSync(path.join(maybeJavaHome, 'lib', 'tools.jar'))) {
                        process.env['JAVA_HOME'] = maybeJavaHome;
                    } else {
                        throw new CordovaError(msg);
                    }
                }
            } else if (isWindows) {
                // Try to auto-detect java in the default install paths.
                var oldSilent = shelljs.config.silent;
                shelljs.config.silent = true;
                var firstJdkDir =
                    shelljs.ls(process.env['ProgramFiles'] + '\\java\\jdk*')[0] ||
                    shelljs.ls('C:\\Program Files\\java\\jdk*')[0] ||
                    shelljs.ls('C:\\Program Files (x86)\\java\\jdk*')[0];
                shelljs.config.silent = oldSilent;
                if (firstJdkDir) {
                    // shelljs always uses / in paths.
                    firstJdkDir = firstJdkDir.replace(/\//g, path.sep);
                    if (!javacPath) {
                        process.env['PATH'] += path.delimiter + path.join(firstJdkDir, 'bin');
                    }
                    process.env['JAVA_HOME'] = firstJdkDir;
                }
            }
        }
    }).then(function() {
            var msg =
                'Failed to run "javac -version", make sure that you have a JDK installed.\n' +
                'You can get it from: http://www.oracle.com/technetwork/java/javase/downloads.\n';
            if (process.env['JAVA_HOME']) {
                msg += 'Your JAVA_HOME is invalid: ' + process.env['JAVA_HOME'] + '\n';
            }
            // We use tryCommand with catchStderr = true, because
            // javac writes version info to stderr instead of stdout
            return tryCommand('javac -version', msg, true)
                .then(function (output) {
                    //Let's check for at least Java 8, and keep it future proof so we can support Java 10
                    var match = /javac ((?:1\.)(?:[8-9]\.)(?:\d+))|((?:1\.)(?:[1-9]\d+\.)(?:\d+))/i.exec(output);
                    return match && match[1];
                });
        });
};

module.exports.run = function() {
     return Q.all([this.check_java(), this.check_android()])
     .then(function(values) {
         console.log('ANDROID_HOME=' + process.env['ANDROID_HOME']);
         console.log('JAVA_HOME=' + process.env['JAVA_HOME']);

         if (!values[0]) {
            throw new CordovaError('Requirements check failed for JDK 1.8 or greater');
         }


         if (!values[1]) {
            throw new CordovaError('Requirements check failed for Android SDK');
         }
     });
};
