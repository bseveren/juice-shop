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

async function fetchLatestRelease() {
    const BASE_URL = "https://gitlab.someproject.com/api/v4/projects/624"; // project: detection/orion
    const RELEASES = await runCmd(`curl --header "Private-Token: ${process.env["GITLAB_TOKEN"]}" "${BASE_URL}/releases"`);
    const RELEASE = JSON.parse(RELEASES)[0];
    console.log(`Found realease ${RELEASE.tag_name}`);
    return RELEASE.tag_name;
}

exports.CreateTemplates = async function CreateTemplates(opts) {

    const projects = opts.moduleName;
    const rushConfig = rushLib.RushConfiguration.loadFromDefaultLocation({
        startingFolder: process.cwd(),
    });
    // let success = true;

    const thisProject = rushConfig.getProjectByName(require(`${__dirname}/../../package.json`).name);
    const destPath = `${thisProject.projectFolder}/dist/bundle`;

    // @TODO: Make these commands compatible.
    // Clean and create the directories.
    runCmd(`rm -rf ${destPath}`);
    runCmd(`mkdir -p ${destPath}/dynamic/templates`);
    runCmd(`cp ${thisProject.projectFolder}/src/templates/someproject-pagespeed.js ${destPath}/dynamic/templates`);
    runCmd(`cp ${thisProject.projectFolder}/src/templates/static-config.json ${destPath}/dynamic/templates`);

    try {
        // Iterate over projects and fetch the templates of each one.
        projects.forEach((project) => { 
            const p = rushConfig.findProjectByShorthandName(project);
            if (!p) {
                console.error(`Product with name "${project}" was not found.`);
                return;
            }

            console.log(`\n\nRunning for ${p.packageJson.name}\n\n`);

            extractFrom(p, destPath);
            // if (!success) {
            //     return;
            // }
            console.log(`Finished ${project}...`)

        });
    } catch (_err) {
        //  console.error(`"Product with name "${project}" was not found.`);
        console.error(_err);
        process.exit(1);
        // success = false;
    }

    const O2_PSV = await fetchLatestRelease();
    await extractBunfleFromSomeProject(destPath, O2_PSV);
    const SAMPLE = CalculateSample(opts.mgRate);
    const content = fs.readFileSync(`${destPath}/dynamic/templates/someproject-pagespeed.js`, 'utf8').toString();
    const newContent = content.replace(/\{\{RESOLVED_SAMPLE\}\}/g, SAMPLE);
    fs.writeFileSync(`${destPath}/dynamic/templates/someproject-pagespeed.js`, newContent);
}
