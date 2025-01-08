const handlers = {
    'source-file': {
        install: function (obj, plugin, project, options) {
            installHelper('source-file', obj, plugin.dir, project.projectDir, plugin.id, options, project);
        },
        uninstall: function (obj, plugin, project, options) {
            uninstallHelper('source-file', obj, project.projectDir, plugin.id, options, project);
        }
    },
    'header-file': {
        install: function (obj, plugin, project, options) {
            installHelper('header-file', obj, plugin.dir, project.projectDir, plugin.id, options, project);
        },
        uninstall: function (obj, plugin, project, options) {
            uninstallHelper('header-file', obj, project.projectDir, plugin.id, options, project);
        }
    },
    'resource-file': {
        install: function (obj, plugin, project, options) {
            const src = obj.src;
            let target = obj.target;
            const srcFile = path.resolve(plugin.dir, src);

            if (!target) {
                target = path.basename(src);
            }
            const destFile = path.resolve(project.resources_dir, target);

            if (!fs.existsSync(srcFile)) {
                throw new CordovaError(`Cannot find resource file "${srcFile}" for plugin ${plugin.id} in iOS platform`);
            }
            if (fs.existsSync(destFile)) {
                throw new CordovaError(`File already exists at destination "${destFile}" for resource file specified by plugin ${plugin.id} in iOS platform`);
            }
            project.xcode.addResourceFile(path.join('Resources', target));
            const link = !!(options && options.link);
            copyFile(plugin.dir, src, project.projectDir, destFile, link);
        },
        uninstall: function (obj, plugin, project, options) {
            const src = obj.src;
            let target = obj.target;

            if (!target) {
                target = path.basename(src);
            }
            const destFile = path.resolve(project.resources_dir, target);

            project.xcode.removeResourceFile(path.join('Resources', target));
            fs.removeSync(destFile);
        }
    },
    framework: { // CB-5238 custom frameworks only
        install: function (obj, plugin, project, options) {
            const src = obj.src;
            const custom = !!(obj.custom); // convert to boolean (if truthy/falsy)
            const embed = !!(obj.embed); // convert to boolean (if truthy/falsy)
            const link = !embed; // either link or embed can be true, but not both. the other has to be false

            if (!custom) {
                const keepFrameworks = keep_these_frameworks;

                if (keepFrameworks.indexOf(src) < 0) {
                    if (obj.type === 'podspec') {
                        // podspec handled in Api.js
                    } else {
                        project.frameworks[src] = project.frameworks[src] || 0;
                        project.frameworks[src]++;
                        const opt = { customFramework: false, embed: false, link: true, weak: obj.weak };
                        events.emit('verbose', util.format('Adding non-custom framework to project... %s -> %s', src, JSON.stringify(opt)));
                        project.xcode.addFramework(src, opt);
                        events.emit('verbose', util.format('Non-custom framework added to project. %s -> %s', src, JSON.stringify(opt)));
                    }
                }
                return;
            }
            const srcFile = path.resolve(plugin.dir, src);
            const targetDir = path.resolve(project.plugins_dir, plugin.id, path.basename(src));
            if (!fs.existsSync(srcFile)) throw new CordovaError(`Cannot find framework "${srcFile}" for plugin ${plugin.id} in iOS platform`);
            if (fs.existsSync(targetDir)) throw new CordovaError(`Framework "${targetDir}" for plugin ${plugin.id} already exists in iOS platform`);
            const symlink = !!(options && options.link);
            copyFile(plugin.dir, src, project.projectDir, targetDir, symlink); // frameworks are directories
            // CB-10773 translate back slashes to forward on win32
            const project_relative = fixPathSep(path.relative(project.projectDir, targetDir));
            // CB-11233 create Embed Frameworks Build Phase if does not exist
            const existsEmbedFrameworks = project.xcode.buildPhaseObject('PBXCopyFilesBuildPhase', 'Embed Frameworks');
            if (!existsEmbedFrameworks && embed) {
                events.emit('verbose', '"Embed Frameworks" Build Phase (Embedded Binaries) does not exist, creating it.');
                project.xcode.addBuildPhase([], 'PBXCopyFilesBuildPhase', 'Embed Frameworks', null, 'frameworks');
            }
            const opt = { customFramework: true, embed, link, sign: true };
            events.emit('verbose', util.format('Adding custom framework to project... %s -> %s', src, JSON.stringify(opt)));
            project.xcode.addFramework(project_relative, opt);
            events.emit('verbose', util.format('Custom framework added to project. %s -> %s', src, JSON.stringify(opt)));
        },
        uninstall: function (obj, plugin, project, options) {
            const src = obj.src;

            if (!obj.custom) { // CB-9825 cocoapod integration for plugins
                const keepFrameworks = keep_these_frameworks;
                if (keepFrameworks.indexOf(src) < 0) {
