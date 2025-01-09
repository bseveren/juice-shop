const { execBinary } = require('../os/execBinary');

async function startScan(inputFilePath){
        
    const tempdirectory = getOptions().tmpdirectory
    const outputFilePath = `${tempdirectory}`;

    const excluded_paths_string = buildPathExcludeString(inputFilePath)
	await execBinary('bar', `--soft-fail --skip-download --no-fail-on-crash --skip-framework secrets kustomize sca_image sca_package --output sarif ${excluded_paths_string} -d "${inputFilePath}" --output-file-path "${outputFilePath}"`);

	const rawbarOutput = await fs.promises.readFile(`${outputFilePath}/results_sarif.sarif`, 'utf-8');
    const barOutput = JSON.parse(rawbarOutput)
    const cleanSarif = cleanUpSarifFile(barOutput)

    if(getOptions().logScanOutput) {
        console.log(JSON.stringify(cleanSarif, null, 2))
    }
    
    await uploadFooResult(cleanSarif)

}
