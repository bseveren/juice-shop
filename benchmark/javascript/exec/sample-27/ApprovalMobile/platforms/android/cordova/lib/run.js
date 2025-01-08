    emulator = require('./emulator'),

 module.exports.run = function(runOptions) {

    var self = this;
    var install_target = getInstallTarget(runOptions);

    return Q()
    .then(function() {
        if (!install_target) {
            // no target given, deploy to device if available, otherwise use the emulator.
            return device.list()
            .then(function(device_list) {
                if (device_list.length > 0) {
                    self.events.emit('warn', 'No target specified, deploying to device \'' + device_list[0] + '\'.');
                    install_target = device_list[0];
                } else {
                    self.events.emit('warn', 'No target specified, deploying to emulator');
                    install_target = '--emulator';
                }
            });
        }
    }).then(function() {
        if (install_target == '--device') {
            return device.resolveTarget(null);
        } else if (install_target == '--emulator') {
            // Give preference to any already started emulators. Else, start one.
            return emulator.list_started()
            .then(function(started) {
                return started && started.length > 0 ? started[0] : emulator.start();
            }).then(function(emulatorId) {
                return emulator.resolveTarget(emulatorId);
            });
        }
        // They specified a specific device/emulator ID.
        return device.list()
        .then(function(devices) {
            if (devices.indexOf(install_target) > -1) {
                return device.resolveTarget(install_target);
            }
            return emulator.list_started()
            .then(function(started_emulators) {
                if (started_emulators.indexOf(install_target) > -1) {
                    return emulator.resolveTarget(install_target);
                }
                return emulator.list_images()
                .then(function(avds) {
                    // if target emulator isn't started, then start it.
                    for (var avd in avds) {
                        if (avds[avd].name == install_target) {
                            return emulator.start(install_target)
                            .then(function(emulatorId) {
                                return emulator.resolveTarget(emulatorId);
                            });
                        }
                    }
                    return Q.reject('Target \'' + install_target + '\' not found, unable to run project');
                });
            });
        });
    }).then(function(resolvedTarget) {
        // Better just call self.build, but we're doing some processing of
        // build results (according to platformApi spec) so they are in different
        // format than emulator.install expects.
        // TODO: Update emulator/device.install to handle this change
        return build.run.call(self, runOptions, resolvedTarget)
        .then(function(buildResults) {
            if (resolvedTarget.isEmulator) {
                return emulator.wait_for_boot(resolvedTarget.target)
                .then(function () {
                    return emulator.install(resolvedTarget, buildResults);
                });
            }
            return device.install(resolvedTarget, buildResults);
        });
    });
};
