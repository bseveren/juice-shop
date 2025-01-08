class HookShellScriptPlugin {
  /**
   * Add hooks and scripts to run on each hook.
   * @param {{[hookName: string]: Array<string | {command: string, args: string[]}>}} hooks
   */
  constructor(hooks = {}) {
    this._procs = {};
    this._hooks = hooks;
  }

  /**
   * Add callbacks for each hook. If a hook doesn't exist on the compiler, throw an error.
   */
  apply(compiler) {
    this.watch = compiler.options.watch;
    Object.keys(this._hooks).forEach(hookName => {
      if(!compiler.hooks[hookName]) {
        this._handleError(`The hook ${hookName} does not exist on the Webpack compiler.`);
      }
      compiler.hooks[hookName].tap(NAME, () => {
        this._hooks[hookName].forEach(s => this._handleScript(s));
      });
    });
  }

  /**
   * Run a script, cancelling an already running iteration of that script.
   * @param {command: string, args: string[], sync: boolean} script
   */
  _handleScript(script) {
    const command = script.command;
    const args = script.args || [];
    const key = [command, ...args].join(' ');
    if(script.sync) {
      this._handleScriptSync(key, command, args);
    } else {
      this._handleScriptAsync(key, command, args);
    }
  }

  _handleScriptSync(key, command, args) {
    this._log(`Running sync script: ${key}\n`);
    const result = spawnSync(command, args, { stdio: 'pipe', shell: true });
    const error = result.error || result.stderr.toString();
    if(error) {
      this._onScriptError(key, error);
    }
    this._onScriptComplete(key, error, result.signal);
  }

  _handleScriptAsync(key, command, args) {
    if(this._procs[key]) {
      this._log(`Killing async script: ${key}\n`);
      this._killProc(key);
    }

    this._log(`Running async script: ${key}\n`);

    this._procs[key] = spawn(command, args, { stdio: 'pipe', shell: true });
    this._procs[key].on('error', this._onScriptError.bind(this, key));
    this._procs[key].stderr.on('data', this._onScriptError.bind(this, key));
    this._procs[key].on('exit', this._onScriptComplete.bind(this, key));
  }


  /**
   * Kill a running process.
   * @param {string} key
   */
  _killProc(key) {
    this._procs[key].kill();
  }

  /**
   * Handle an error by killing the build if not in watch mode.
   * @param {string} msg
   */
  _handleError(msg) {
    msg = `\n[${NAME}] ${msg}\n`;
    if(!this.watch) {
      throw new Error(msg);
    }
    console.error(msg);
  }

  /** _onScriptError
   */
  _log(msg) {
    msg = `\n[${NAME}] ${msg}\n`;
    console.log(msg);
  }

  /**
   * When the script has completed, log a success if there was no error while running it.
   * @param {string} key
   * @param {number} error
   * @param {string} msg
   */
  _onScriptComplete(key, error, msg) {
    this._procs[key] = null;
