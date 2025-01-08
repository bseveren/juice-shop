const { logger } = require('@js-logger');
var config = require('cnf');
var fs = require('fs');
var proc = require('child_process');
var path = require('path');
var locker = require('./locker');
var gcs = require('./gcs');

var lock = locker();
var noop = function () {};
var subscribersConfig = config.subscribers;
const baseDir = path.resolve('/data');
var REMOTES = fs.existsSync(baseDir) ? path.join(baseDir, 'remotes') : path.normalize(path.join(__dirname, '..', 'remotes'));

try {
	fs.mkdirSync(REMOTES);
} catch (err) {
	// dir already there...
}

// The personal access token has a tendency to leak into error output of git commands, it's the downside of using the usernama:password@url approach
const personalAccessToken = fs.readFileSync('/secrets/translator/personal-access-token', 'utf8')

const redactSecrets = (output) => {
	if (typeof output === 'string') {
		return output.replace(personalAccessToken, "REDACTED_PERSONAL_ACCESS_TOKEN");
	}
	if (typeof output === 'object') {
		if ('spawnargs' in output) {
			output.spawnargs = output.spawnargs.replace(personalAccessToken, "REDACTED_PERSONAL_ACCESS_TOKEN");
		}
		if ('cmd' in output) {
			output.cmd = output.cmd.replace(personalAccessToken, "REDACTED_PERSONAL_ACCESS_TOKEN");
		}
		if ('Error' in output) {
			output.Error = output.Error.replace(personalAccessToken, "REDACTED_PERSONAL_ACCESS_TOKEN");
		}
	}
	return output;
}

var subscribers = subscribersConfig.map(function (sub, index) {
	if (sub.type === 'gcs') {
		return function (data, _options, callback) {
			gcs.writeFileToCloudStorage(sub.file, data, callback);
		};
	}
	if (sub.type === 'git') {
		logger.info('processing git subscriber');
		var branch = sub.branch || 'master';
		var dir = path.join(REMOTES, 'repo' + index);
		var file = path.join(dir, sub.file || 'texts.json');

		lock(function (free) {
			fs.exists(dir, function (exists) {
				if (exists) {
					return free();
				}

				proc.exec('git clone --single-branch --no-tags --branch ' + sub.branch + ' --depth 1 -- ' + sub.repository + ' ' + dir, (err, stdout, stderr) => {
					if (err) {
						logger.error('git clone failed', redactSecrets(err));
						logger.error('stdout', redactSecrets(stdout));
						logger.error('stderr', redactSecrets(stderr));
					}
					if (!err) {
						logger.info(`git clone succeeded for ${redactSecrets(sub.repository)} into ${dir}`);
						logger.info('stdout', redactSecrets(stdout));
						logger.info('stderr', redactSecrets(stderr));
					}
					free();
				});
			});
		});

		return function (data, options, callback) {
			var message = sub.commitMessage || "Updated Translations";
			var cmd = '' +
				'git status || exit 0\n' +
				'git add ' + file + ' || exit 0\n' +
				'git commit --author "' + options.username + ' <' + (options.email || 'foo@bar.com') + '>" -m "' + message + '" || exit 0\n' +
				'git push ' + sub.repository + ' ' + branch;

			lock(function (free) {
				var ondone = function (err) {
					free();
					callback(err);
				};
				proc.exec('git status; git reset --hard; git clean -df; git checkout ' + branch + '; git pull --no-tags -f', {
					cwd: dir
				}, function (err, stdout, stderr) {
					if (err) {
						logger.error('git reset failed', err);
						logger.error('stdout', stdout);
						logger.error('stderr', stderr);
						return ondone(err);
					}

					logger.info('git reset succeeded.');

					fs.writeFile(file, data, function (err) {
						if (err) {
							logger.error('Failed to update the file', err);
						}
						proc.exec(cmd, {
							cwd: dir
						}, (err, stdout, stderr) => {
							if (err) {
								logger.error('git cmd failed', err);
								logger.error('stdout', stdout);
								logger.error('stderr', stderr);
							}
							if (!err) {
								logger.info('git push commit succeeded');
							}
							ondone();
						});
					});
				});
			});
		};
	}

	throw new Error('unknown subscriber type: ' + sub.type);
});
