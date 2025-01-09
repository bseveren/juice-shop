var handlers = {
    'source-file':{
        install:function(obj, plugin, project, options) {
            if (!obj.src) throw new CordovaError(generateAttributeError('src', 'source-file', plugin.id));
            if (!obj.targetDir) throw new CordovaError(generateAttributeError('target-dir', 'source-file', plugin.id));

            var dest = path.join(obj.targetDir, path.basename(obj.src));

            if(options && options.android_studio === true) {
              dest = path.join('app/src/main/java', obj.targetDir.substring(4), path.basename(obj.src));
            }

            if (options && options.force) {
                copyFile(plugin.dir, obj.src, project.projectDir, dest, !!(options && options.link));
            } else {
                copyNewFile(plugin.dir, obj.src, project.projectDir, dest, !!(options && options.link));
            }
        },
        uninstall:function(obj, plugin, project, options) {
            var dest = path.join(obj.targetDir, path.basename(obj.src));
            
            if(options && options.android_studio === true) {
              dest = path.join('app/src/main/java', obj.targetDir.substring(4), path.basename(obj.src));
            }

            deleteJava(project.projectDir, dest);
        }
    },
    'lib-file':{
        install:function(obj, plugin, project, options) {
            var dest = path.join('libs', path.basename(obj.src));
            if(options && options.android_studio === true) {
              dest = path.join('app/libs', path.basename(obj.src));
            }
            copyFile(plugin.dir, obj.src, project.projectDir, dest, !!(options && options.link));
        },
        uninstall:function(obj, plugin, project, options) {
            var dest = path.join('libs', path.basename(obj.src));
            if(options && options.android_studio === true) {
              dest = path.join('app/libs', path.basename(obj.src));
            }
            removeFile(project.projectDir, dest);
        }
    },
    'resource-file':{
        install:function(obj, plugin, project, options) {
            copyFile(plugin.dir, obj.src, project.projectDir, path.normalize(obj.target), !!(options && options.link));
        },
        uninstall:function(obj, plugin, project, options) {
            removeFile(project.projectDir, path.normalize(obj.target));
        }
    },
    'framework': {
        install:function(obj, plugin, project, options) {
            var src = obj.src;
            if (!src) throw new CordovaError(generateAttributeError('src', 'framework', plugin.id));

            events.emit('verbose', 'Installing Android library: ' + src);
            var parentDir = obj.parent ? path.resolve(project.projectDir, obj.parent) : project.projectDir;
            var subDir;

            if (obj.custom) {
                var subRelativeDir = project.getCustomSubprojectRelativeDir(plugin.id, src);
                copyNewFile(plugin.dir, src, project.projectDir, subRelativeDir, !!(options && options.link));
                subDir = path.resolve(project.projectDir, subRelativeDir);
            } else {
                obj.type = 'sys';
                subDir = src;
            }

            if (obj.type == 'gradleReference') {
                project.addGradleReference(parentDir, subDir);
            } else if (obj.type == 'sys') {
                project.addSystemLibrary(parentDir, subDir);
            } else {
                project.addSubProject(parentDir, subDir);
            }
        },
        uninstall:function(obj, plugin, project, options) {
            var src = obj.src;
            if (!src) throw new CordovaError(generateAttributeError('src', 'framework', plugin.id));

            events.emit('verbose', 'Uninstalling Android library: ' + src);
            var parentDir = obj.parent ? path.resolve(project.projectDir, obj.parent) : project.projectDir;
            var subDir;

            if (obj.custom) {
                var subRelativeDir = project.getCustomSubprojectRelativeDir(plugin.id, src);
                removeFile(project.projectDir, subRelativeDir);
                subDir = path.resolve(project.projectDir, subRelativeDir);
                // If it's the last framework in the plugin, remove the parent directory.
                var parDir = path.dirname(subDir);
                if (fs.existsSync(parDir) && fs.readdirSync(parDir).length === 0) {
                    fs.rmdirSync(parDir);
                }
            } else {
                obj.type = 'sys';
                subDir = src;
            }

