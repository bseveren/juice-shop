var check_reqs = require('../check_reqs');

AntBuilder.prototype.prepEnv = function(opts) {
    var self = this;
    return check_reqs.check_ant()
    .then(function() {
        // Copy in build.xml on each build so that:
        // A) we don't require the Android SDK at project creation time, and
        // B) we always use the SDK's latest version of it.
        /*jshint -W069 */
        var sdkDir = process.env['ANDROID_HOME'];
        /*jshint +W069 */
        var buildTemplate = fs.readFileSync(path.join(sdkDir, 'tools', 'lib', 'build.template'), 'utf8');
        function writeBuildXml(projectPath) {
            var newData = buildTemplate.replace('PROJECT_NAME', self.extractRealProjectNameFromManifest());
            fs.writeFileSync(path.join(projectPath, 'build.xml'), newData);
            if (!fs.existsSync(path.join(projectPath, 'local.properties'))) {
                fs.writeFileSync(path.join(projectPath, 'local.properties'), TEMPLATE);
            }
        }
        writeBuildXml(self.root);
        var propertiesObj = self.readProjectProperties();
        var subProjects = propertiesObj.libs;
        for (var i = 0; i < subProjects.length; ++i) {
            writeBuildXml(path.join(self.root, subProjects[i]));
        }
        if (propertiesObj.systemLibs.length > 0) {
            throw new CordovaError('Project contains at least one plugin that requires a system library. This is not supported with ANT. Use gradle instead.');
        }

        var propertiesFile = opts.buildType + SIGNING_PROPERTIES;
        var propertiesFilePath = path.join(self.root, propertiesFile);
        if (opts.packageInfo) {
            fs.writeFileSync(propertiesFilePath, TEMPLATE + opts.packageInfo.toProperties());
        } else if(isAutoGenerated(propertiesFilePath)) {
            shell.rm('-f', propertiesFilePath);
        }
    });
};
