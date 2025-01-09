async function execBinary(executable, cmd, options = {}){

    const remoteControlFilePath = path.join(__dirname, `../../../bin/${executable}`);
    let executableFileFullPath = remoteControlFilePath
    let destination = ''

    // If we are running the scanner packaged, we need to perform some steps to run binaries
    if (process.pkg) {

        // creating a temporary folder for our executable file
        destination = fs.mkdtempSync(`${os.tmpdir()}${path.sep}`);
        const destinationPath = path.join(destination, executable);
        // copy the executable file into the temporary folder
        fs.copyFileSync(remoteControlFilePath, destinationPath);

        // on Linux systems you need to manually make the file executable
        if(os.platform() !== 'win32') {
            execSync(`chmod +x ${destinationPath}`);
        }

        executableFileFullPath = destinationPath;

    }

    try {
        const result = executeSync(`${executableFileFullPath} ${cmd}`, options);
        await tryCleanupTempBinaryDirectory(executable, destination)
        return result
    } catch(e) {
        await tryCleanupTempBinaryDirectory(executable, destination)
        throw e
    }

}
