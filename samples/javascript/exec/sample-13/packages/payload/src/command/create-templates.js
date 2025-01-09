function runCmd(command, _opts) {
    const opts = { stdio: "pipe"};
    if (!!_opts) {
        opts = _opts;
    }
    try {
        console.log("RUNNING: " , command)
        return execSync(command, opts).toString();
    } catch(_err) {
        if (_err.status > 0) {
            console.error(`Command:\n\n\t"${command}"\n\nfinished with status "${_err.status}"\n`);
            console.error(`Error message:\n\n\t${_err.output.toString().slice(2)}`)
            console.error(_err.stack);
            // Cleaning up.
            try {
                // execSync(`rm -rf ${join(TEMP_DIR, "hydra")}`, {stdio: "pipe"}).toString();
            } catch (_) {}
            try {
                execSync(`docker rm ${O3_PAYLOAD_CONTAINER}`, {stdio: "pipe"}).toString();
            } catch (_) {}
            process.exit(1);
        }
    }
}

async function extractSomethingFromSomeProject(destPath, o2_psv) {
    const rushConfig = rushLib.RushConfiguration.loadFromDefaultLocation({
        startingFolder: process.cwd(),
    });
    // console.log(rushConfig);
    console.info(`RUNNING: Fetching someProject@2 release`);
    runCmd(`node ${resolve(rushConfig.commonScriptsFolder, "fetch-someProject2-release.js")} ${o2_psv}`);
    const PS_VER = fs.readFileSync(resolve(rushConfig.commonTempFolder, "someProject2-version")).toString()
    // We will always want to deploy the last release in the someProject ecosystem.
    // If a rollback is needed in O@2, then we need to create a new release tag with the rollback or remove the last release tag (preferred).
    const output = join(rushConfig.commonTempFolder, `someProject2-${PS_VER}`);
    await extract(resolve(rushConfig.commonTempFolder, `someProject2-${PS_VER}.zip`), {dir: output});
    // We need to change the name of the main file to keep compatibility with our current ecosystem.
    runCmd(`mv ${output}/bundle/templates/someProject-pagespeed.js ${destPath}/dynamic/templates/someProject2-payload.js`)
    runCmd(`mv ${output}/bundle/templates/static-config.json ${destPath}/dynamic/templates/someProject2-static-config.json`)
    runCmd(`cp -r ${output}/bundle/templates/* ${destPath}/dynamic/templates`);
    // psversion MUST be the someProject@2 versions to let triumph know about the compiled files
    runCmd(`cp -r ${output}/bundle/psversion ${destPath}/dynamic/`);
    runCmd(`rm -rf ${output}`);
}

exports.CreateTemplates = async function CreateTemplates(opts) {

    const projects = opts.moduleName;
    const rushConfig = rushLib.RushConfiguration.loadFromDefaultLocation({
        startingFolder: process.cwd(),
    });
    // let success = true;

    const thisProject = rushConfig.getProjectByName(require(`${__dirname}/../../package.json`).name);
    const destPath = `${thisProject.projectFolder}/dist/bundle`;
    const O2_PSV = await fetchLatestsomeProject2Release();
    await extractSomethingFromSomeProject(destPath, O2_PSV);
    const SAMPLE = CalculateSample(opts.mgRate);
    const content = fs.readFileSync(`${destPath}/dynamic/templates/someProject-pagespeed.js`, 'utf8').toString();
    const newContent = content.replace(/\{\{RESOLVED_SAMPLE\}\}/g, SAMPLE);
    fs.writeFileSync(`${destPath}/dynamic/templates/someProject-pagespeed.js`, newContent);
}
