function getAssetPath(compilation, name) {
  return path.join(compilation.getPath(compilation.compiler.outputPath), name.split('?')[0]);
}

function getSource(compilation, name) {
  const path = getAssetPath(compilation, name);
  return fs.readFileSync(path, { encoding: 'utf-8' });
}

class BundleTrackerPlugin {
  /**
   * Track assets file location per bundle
   * @param {Options} options
   */
  constructor(options) {
    /** @type {Options} */
    this.options = options;
    /** @type {Contents} */
    this.contents = {
      status: 'initialization',
      assets: {},
      chunks: {},
    };
    this.initializingEntries = new Set();
    this.name = 'BundleTrackerPlugin';

    this.outputChunkDir = '';
    this.outputTrackerFile = '';
    this.outputTrackerDir = '';
  }
  /**
   * Setup parameter from compiler data
   * @param {Compiler} compiler
   * @returns this
   */
  _setParamsFromCompiler(compiler) {
    this.options = defaults({}, this.options, {
      path: get(compiler.options, 'output.path', process.cwd()),
      publicPath: get(compiler.options, 'output.publicPath', ''),
      filename: 'webpack-stats.json',
      logTime: false,
      relativePath: false,
      integrity: false,
      indent: 2,
      // https://www.w3.org/TR/SRI/#cryptographic-hash-functions
      integrityHashes: ['sha256', 'sha384', 'sha512'],
    });

    if (this.options.filename?.includes('/')) {
      throw Error(
        "The `filename` shouldn't include a `/`. Please use the `path` parameter to " +
          "build the directory path and use `filename` only for the file's name itself.\n" +
          'TIP: you can use `path.join` to build the directory path in your config file.',
      );
    }

    // Set output directories
    this.outputChunkDir = path.resolve(get(compiler.options, 'output.path', process.cwd()));
    // @ts-ignore: TS2345 this.options.path can't be undefined here because we set a default value above
    // @ts-ignore: TS2345 this.options.filename can't be undefined here because we set a default value above
    this.outputTrackerFile = path.resolve(path.join(this.options.path, this.options.filename));
    this.outputTrackerDir = path.dirname(this.outputTrackerFile);

    Object.keys(compiler.options.entry).forEach(entry => {
      this.initializingEntries.add(entry);
    });

    return this;
  }
  /**
   * Write bundle tracker stats file
   *
   * @param {Compiler} compiler
   * @param {Partial<Contents>} contents
   */
  _writeOutput(compiler, contents) {
    assign(this.contents, contents, {
      assets: mergeObjects(this.contents.assets, contents.assets),
      chunks: mergeObjects(this.contents.chunks, contents.chunks),
    });

    if (this.options.publicPath) {
      this.contents.publicPath = this.options.publicPath;
    }

    fs.mkdirSync(this.outputTrackerDir, { recursive: true, mode: 0o755 });
    fs.writeFileSync(this.outputTrackerFile, JSON.stringify(this.contents, null, this.options.indent));
  }
  /**
   * Compute hash for a content
   * @param {string} content
   */
  _computeIntegrity(content) {
    // @ts-ignore: TS2532 this.options.integrityHashes can't be undefined here because
    // we set a default value on _setParamsFromCompiler
    return this.options.integrityHashes
      .map(algorithm => {
        const hash = crypto
          .createHash(algorithm)
          .update(content, 'utf8')
          .digest('base64');

        return `${algorithm}-${hash}`;
      })
      .join(' ');
  }
  /**
   * Handle compile hook
   * @param {Compiler} compiler

  _handleDone(compiler, stats) {
    if (stats.hasErrors()) {
      const findError = compilation => {
        if (compilation.errors.length > 0) {
          return compilation.errors[0];
        }
        return compilation.children.find(child => findError(child));
      };
      const error = findError(stats.compilation);
      this._writeOutput(compiler, {
        status: 'error',
        error: get(error, 'name', 'unknown-error'),
        message: stripAnsi(error['message']),
      });

      return;
    }

    stats.compilation.chunkGroups.forEach(chunkGroup => {
      this.initializingEntries.delete(chunkGroup.name);
    });
    let status = this.initializingEntries.size === 0 ? 'done' : 'compile';

    /** @type {Contents} */
    const output = { status: status, assets: {}, chunks: {} };
    each(stats.compilation.assets, (file, assetName) => {
      const fileInfo = {
        name: assetName,
        path: getAssetPath(stats.compilation, assetName),
      };

      if (this.options.integrity === true) {
        fileInfo.integrity = this._computeIntegrity(getSource(stats.compilation, assetName));
      }

      if (this.options.publicPath) {
        fileInfo.publicPath = this.options.publicPath + assetName;
      }

      if (this.options.relativePath === true) {
        fileInfo.path = path.relative(this.outputChunkDir, fileInfo.path);
      }

      output.assets[assetName] = fileInfo;
    });
    each(stats.compilation.chunkGroups, chunkGroup => {
      if (!chunkGroup.isInitial()) return;

      output.chunks[chunkGroup.name] = chunkGroup.getFiles();
    });

    if (this.options.logTime === true) {
      output.startTime = stats.startTime;
      output.endTime = stats.endTime;
    }

    this._writeOutput(compiler, output);
  }
