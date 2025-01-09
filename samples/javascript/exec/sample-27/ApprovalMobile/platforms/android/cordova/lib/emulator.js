module.exports.install = function(givenTarget, buildResults) {

    var target;
    var manifest = new AndroidManifest(path.join(__dirname, '../../AndroidManifest.xml'));
    var pkgName = manifest.getPackageId();

    // resolve the target emulator
    return Q().then(function () {
        if (givenTarget && typeof givenTarget == 'object') {
            return givenTarget;
        } else {
            return module.exports.resolveTarget(givenTarget);
        }

    // set the resolved target
    }).then(function (resolvedTarget) {
        target = resolvedTarget;

    // install the app
    }).then(function () {
        // This promise is always resolved, even if 'adb uninstall' fails to uninstall app
        // or the app doesn't installed at all, so no error catching needed.
        return Q.when()
        .then(function() {

            var apk_path = build.findBestApkForArchitecture(buildResults, target.arch);
            var execOptions = {
                cwd: os.tmpdir(),
                timeout:    INSTALL_COMMAND_TIMEOUT, // in milliseconds
                killSignal: EXEC_KILL_SIGNAL
            };

            events.emit('log', 'Using apk: ' + apk_path);
            events.emit('verbose', 'Installing app on emulator...');

            // A special function to call adb install in specific environment w/ specific options.
            // Introduced as a part of fix for http://issues.apache.org/jira/browse/CB-9119
            // to workaround sporadic emulator hangs
            function adbInstallWithOptions(target, apk, opts) {
                events.emit('verbose', 'Installing apk ' + apk + ' on ' + target + '...');

                var command = 'adb -s ' + target + ' install -r "' + apk + '"';
                return Q.promise(function (resolve, reject) {
                    child_process.exec(command, opts, function(err, stdout, stderr) {
                        if (err) reject(new CordovaError('Error executing "' + command + '": ' + stderr));
                        // adb does not return an error code even if installation fails. Instead it puts a specific
                        // message to stdout, so we have to use RegExp matching to detect installation failure.
                        else if (/Failure/.test(stdout)) reject(new CordovaError('Failed to install apk to emulator: ' + stdout));
                        else resolve(stdout);
                    });
                });
            }

            function installPromise () {
                return adbInstallWithOptions(target.target, apk_path, execOptions)
                .catch(function (error) {
                    // CB-9557 CB-10157 only uninstall and reinstall app if the one that
                    // is already installed on device was signed w/different certificate
                    if (!/INSTALL_PARSE_FAILED_INCONSISTENT_CERTIFICATES/.test(error.toString()))
                        throw error;

                    events.emit('warn', 'Uninstalling app from device and reinstalling it again because the ' +
                        'installed app already signed with different key');

                    // This promise is always resolved, even if 'adb uninstall' fails to uninstall app
                    // or the app doesn't installed at all, so no error catching needed.
                    return Adb.uninstall(target.target, pkgName)
                    .then(function() {
                        return adbInstallWithOptions(target.target, apk_path, execOptions);
                    });
                });
            }

            return retry.retryPromise(NUM_INSTALL_RETRIES, installPromise)
            .then(function (output) {
                events.emit('log', 'INSTALL SUCCESS');
            });
        });
    // unlock screen
    }).then(function () {

        events.emit('verbose', 'Unlocking screen...');
        return Adb.shell(target.target, 'input keyevent 82');
    }).then(function () {
        Adb.start(target.target, pkgName + '/.' + manifest.getActivity().getName());
    // report success or failure
    }).then(function (output) {
        events.emit('log', 'LAUNCH SUCCESS');
    });
};
