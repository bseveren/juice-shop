module.exports.prepare = function (cordovaProject) {

    var self = this;

    this._config = updateConfigFilesFrom(cordovaProject.projectConfig,
        this._munger, this.locations);

    // Update own www dir with project's www assets and plugins' assets and js-files
    return Q.when(updateWwwFrom(cordovaProject, this.locations))
    .then(function () {
        // update project according to config.xml changes.
        return updateProjectAccordingTo(self._config, self.locations);
    })
    .then(function () {
        handleIcons(cordovaProject.projectConfig, self.root);
        handleSplashes(cordovaProject.projectConfig, self.root);
    })
    .then(function () {
        self.events.emit('verbose', 'updated project successfully');
    });
};

function updateProjectAccordingTo(platformConfig, locations) {
    // Update app name by editing res/values/strings.xml
    var name = platformConfig.name();
    var strings = xmlHelpers.parseElementtreeSync(locations.strings);
    strings.find('string[@name="app_name"]').text = name;
    fs.writeFileSync(locations.strings, strings.write({indent: 4}), 'utf-8');
    events.emit('verbose', 'Wrote out Android application name to "' + name + '"');

    // Java packages cannot support dashes
    var pkg = (platformConfig.android_packageName() || platformConfig.packageName()).replace(/-/g, '_');

    var manifest = new AndroidManifest(locations.manifest);
    var orig_pkg = manifest.getPackageId();

    manifest.getActivity()
        .setOrientation(findOrientationValue(platformConfig))
        .setLaunchMode(findAndroidLaunchModePreference(platformConfig));

    manifest.setVersionName(platformConfig.version())
        .setVersionCode(platformConfig.android_versionCode() || default_versionCode(platformConfig.version()))
        .setPackageId(pkg)
        .setMinSdkVersion(platformConfig.getPreference('android-minSdkVersion', 'android'))
        .setMaxSdkVersion(platformConfig.getPreference('android-maxSdkVersion', 'android'))
        .setTargetSdkVersion(platformConfig.getPreference('android-targetSdkVersion', 'android'))
        .write();

    var javaPattern = path.join(locations.root, 'src', orig_pkg.replace(/\./g, '/'), '*.java');
    var java_files = shell.ls(javaPattern).filter(function(f) {
        return shell.grep(/extends\s+CordovaActivity/g, f);
    });

    if (java_files.length === 0) {
        throw new CordovaError('No Java files found which extend CordovaActivity.');
    } else if(java_files.length > 1) {
        events.emit('log', 'Multiple candidate Java files (.java files which extend CordovaActivity) found. Guessing at the first one, ' + java_files[0]);
    }

    var destFile = path.join(locations.root, 'src', pkg.replace(/\./g, '/'), path.basename(java_files[0]));
    shell.mkdir('-p', path.dirname(destFile));
    shell.sed(/package [\w\.]*;/, 'package ' + pkg + ';', java_files[0]).to(destFile);
    events.emit('verbose', 'Wrote out Android package name to "' + pkg + '"');

    if (orig_pkg !== pkg) {
        // If package was name changed we need to remove old java with main activity
        shell.rm('-Rf',java_files[0]);
        // remove any empty directories
        var currentDir = path.dirname(java_files[0]);
        var sourcesRoot = path.resolve(locations.root, 'src');
        while(currentDir !== sourcesRoot) {
            if(fs.existsSync(currentDir) && fs.readdirSync(currentDir).length === 0) {
                fs.rmdirSync(currentDir);
                currentDir = path.resolve(currentDir, '..');
            } else {
                break;
            }
        }
    }
}
