class Walker {
    constructor() {
        this.tasks = [];
        this.records = {};
        this.dictionary = {};
        this.patches = {};
        this.params = {};
        this.symLinks = {};
    }
    appendRecord({ file, store }) {
        if (this.records[file]) {
            return;
        }
        if (store === common_1.STORE_BLOB ||
            store === common_1.STORE_CONTENT ||
            store === common_1.STORE_LINKS) {
            // make sure we have a real file
            if (strictVerify) {
                (0, assert_1.default)(file === (0, common_1.toNormalizedRealPath)(file));
            }
        }
        this.records[file] = { file };
    }
    append(task) {
        if (strictVerify) {
            (0, assert_1.default)(typeof task.file === 'string');
            (0, assert_1.default)(task.file === (0, common_1.normalizePath)(task.file));
        }
        this.appendRecord(task);
        this.tasks.push(task);
        const what = {
            [common_1.STORE_BLOB]: 'Bytecode of',
            [common_1.STORE_CONTENT]: 'Content of',
            [common_1.STORE_LINKS]: 'Directory',
            [common_1.STORE_STAT]: 'Stat info of',
        }[task.store];
        if (task.reason) {
            log_1.log.debug(`${what} ${task.file} is added to queue. It was required from ${task.reason}`);
        }
        else {
            log_1.log.debug(`${what} ${task.file} is added to queue.`);
        }
    }
    appendSymlink(file, realFile) {
        const a = findCommonJunctionPoint(file, realFile);
        file = a.file;
        realFile = a.realFile;
        if (!this.symLinks[file]) {
            const dn = path_1.default.dirname(file);
            this.appendFileInFolder({
                file: dn,
                store: common_1.STORE_LINKS,
                data: path_1.default.basename(file),
            });
            log_1.log.debug(`adding symlink ${file}  => ${path_1.default.relative(file, realFile)}`);
            this.symLinks[file] = realFile;
            this.appendStat({
                file: realFile,
                store: common_1.STORE_STAT,
            });
            this.appendStat({
                file: dn,
                store: common_1.STORE_STAT,
            });
            this.appendStat({
                file,
                store: common_1.STORE_STAT,
            });
        }
    }
    appendStat(task) {
        (0, assert_1.default)(task.store === common_1.STORE_STAT);
        this.append(task);
    }
    appendFileInFolder(task) {
        if (strictVerify) {
            (0, assert_1.default)(task.store === common_1.STORE_LINKS);
            (0, assert_1.default)(typeof task.file === 'string');
        }
        const realFile = (0, common_1.toNormalizedRealPath)(task.file);
        if (realFile === task.file) {
            this.append(task);
            return;
        }
        this.append(Object.assign(Object.assign({}, task), { file: realFile }));
        this.appendStat({
            file: task.file,
            store: common_1.STORE_STAT,
        });
        this.appendStat({
            file: path_1.default.dirname(task.file),
            store: common_1.STORE_STAT,
        });
    }
    appendBlobOrContent(task) {
        if (strictVerify) {
            (0, assert_1.default)(task.file === (0, common_1.normalizePath)(task.file));
        }
        (0, assert_1.default)(task.store === common_1.STORE_BLOB || task.store === common_1.STORE_CONTENT);
        (0, assert_1.default)(typeof task.file === 'string');

    async stepDerivatives_ALIAS_AS_RELATIVE(record, marker, derivative) {
        const file = (0, common_1.normalizePath)(path_1.default.join(path_1.default.dirname(record.file), derivative.alias));
        let stat;
        try {
            stat = await fs_extra_1.default.stat(file);
        }
        catch (error) {
            const { toplevel } = marker;
            const exception = error;
            const debug = !toplevel && exception.code === 'ENOENT';
            const level = debug ? 'debug' : 'warn';
            log_1.log[level](`Cannot stat, ${exception.code}`, [
                file,
                `The file was required from '${record.file}'`,
            ]);
        }
        if (stat && stat.isFile()) {
            this.appendBlobOrContent({
                file,
                marker,
                store: common_1.STORE_CONTENT,
                reason: record.file,
            });
        }
    }
