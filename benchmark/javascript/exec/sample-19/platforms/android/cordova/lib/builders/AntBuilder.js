var check_reqs = require('../check_reqs');

AntBuilder.prototype.build = function(opts) {
    // Without our custom_rules.xml, we need to clean before building.
    var ret = Q();
    if (!hasCustomRules(this.root)) {
        // clean will call check_ant() for us.
        ret = this.clean(opts);
    }

    var args = this.getArgs(opts.buildType == 'debug' ? 'debug' : 'release', opts);
    return check_reqs.check_ant()
    .then(function() {
        return spawn('ant', args, {stdio: 'pipe'});
    }).progress(function (stdio){
        if (stdio.stderr) {
            process.stderr.write(stdio.stderr);
        } else {
            process.stdout.write(stdio.stdout);
        }
    }).catch(function (error) {
        if (error.toString().indexOf('Unable to resolve project target') >= 0) {
            return check_reqs.check_android_target(error).then(function() {
                // If due to some odd reason - check_android_target succeeds
                // we should still fail here.
                return Q.reject(error);
            });
        }
        return Q.reject(error);
    });
};
