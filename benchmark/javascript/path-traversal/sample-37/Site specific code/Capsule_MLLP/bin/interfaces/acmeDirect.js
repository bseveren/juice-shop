function init(pyConfig, pool, serverChannelCacheMap, log) {

    // define function with scope including pool, cachemap and log objects from mllp_receive.js script

    // writeToFile
    //  - creates .json file containing data frames from message
    //  - calls Python script to build custom .crf file
    //  - registers new crf file in database

    writeToFile = async (measurementArray, bedid) => {
        if (!pyConfig || !pyConfig.enabled) {
            log.error('Received acme message without valid Python configuration.');
            log.error('Make sure Python Writer is enabled & properly configured.');
            return;
        }

        log.debug(`Writing data file for channel ${serverChannelCacheMap[bedid].channel}`);

        let jsonDirectory = path.join(__dirname, "..", "..", "crf_writer_json");
        if (!fs.existsSync(jsonDirectory)){
            fs.mkdirSync(jsonDirectory);
        }

        let namespace = 'CAPSULE_acmeA_VITAL';
        let startTime = measurementArray[0].startTime;
        let endTime = measurementArray[measurementArray.length - 1].startTime;
        let archivePath = path.join(pyConfig.data_archive, serverChannelCacheMap[bedid].channel);
        let jsonPath;
        let crfFilename;


        // write measurement data to JSON file
        jsonPath = writeJSON(
            jsonDirectory,
            measurementArray,
            serverChannelCacheMap[bedid].channel,
            measurementArray[0].startTime,
            namespace
        );

        // write CRF file
        try {
            crfFilename = await buildCRF(
                jsonPath,
                serverChannelCacheMap[bedid].channel,
                namespace,
                archivePath
            );

            log.trace(`Data file created at ${path.join(archivePath, crfFilename)}`);

        } catch (err) {
            log.error(`Error building data file for BedID: ${serverChannelCacheMap[bedid].channel}`);
            log.error(err);
            return;
        }

        // TODO -- maybe promise.all these three functions v

        // register file with database (insert into bin_files)
        registerCRFFile(pool, {
            filename: path.join(archivePath, crfFilename),
            bedid: serverChannelCacheMap[bedid].channel,
            namespace: namespace,
            start_time: startTime,
            end_time: endTime > startTime ? endTime : startTime + 2000,   // make sure binFile has nonzero length
            machineipadd: serverChannelCacheMap[bedid].server,
            batchid: '0'
        });

        // build transfer file
        createTransferFile(crfFilename, archivePath);

        // clean up JSON file
        removeJSONFile(jsonPath);

        // yay
        log.debug(`${namespace} data file successfully created for ${serverChannelCacheMap[bedid].channel}`);


         // --------                        ------------ \\
        // ---------  scoped function defs  ------------- \\

        function writeJSON(outputDirectory, jsonContent, channel, startTime, namespace) {
            log.trace(`Writing JSON file to ${outputDirectory} for ${channel}`);

            try {
                let filename = `${channel}-${startTime}_${namespace}.json`;
                let filePath = path.join(outputDirectory, filename);
                let content = JSON.stringify(jsonContent);

                fs.writeFileSync(filePath, content);
                log.trace(`JSON file created at ${filePath}`);

                return filePath;
        
            } catch (err) {
                log.error(`Error writing JSON file for ${channel}: ${err}`);

                return null;
            }
        }
        
        /* Spawns child process which invokes hl7_to_crf.py script to build crf file.
            Inputs:
                jsonPath: path to JSON file containing data frame info
                channel: bedid / device channel, used in file naming
                namespace: signal namespace
                archivePath: output directory

const acmeDirectParser = (message, bedid) => {
    let ACK = { status: 'AA' };
    let OBXSegs = message.get('OBX');
    let segIndex = 0;

    let measurementArray = [];
    let currentMeasurement = null;
    let currentMeasurementIdx = 0;


    for (segIndex = 0; segIndex < OBXSegs.length; segIndex += 1) {
        if (!isNaN(OBXSegs.get(segIndex).get("OBX.3.1").toString())) {
            // if we know the signal & it has a value
            if (
                acmeDirectChannelMap[OBXSegs.get(segIndex).get("OBX.5.3").toString().toUpperCase()]
                && OBXSegs.get(segIndex).get("OBX.5.5").toString()
            ) {
                // check if new measurement set
                if (OBXSegs.get(segIndex).get("OBX.3.1").toString() !== currentMeasurement) {
                    currentMeasurement = OBXSegs.get(segIndex).get("OBX.3.1").toString();

                    measurementArray.push({
                        vitals: {},
                        startTime: new Date(OBXSegs.get(segIndex).get("OBX.14").toString()).getTime()
                    });

                    currentMeasurementIdx = measurementArray.length - 1;
                }

                measurementArray[currentMeasurementIdx].vitals[acmeDirectChannelMap[OBXSegs.get(segIndex).get("OBX.5.3").toString().toUpperCase()]] = [];
                measurementArray[currentMeasurementIdx].vitals[acmeDirectChannelMap[OBXSegs.get(segIndex).get("OBX.5.3").toString().toUpperCase()]]
                    .push(parseFloat(OBXSegs.get(segIndex).get("OBX.5.5").toString()));
            }
        }
    }

    if (measurementArray.length > 0) {
        // async function to handle bin file creation
        writeToFile(measurementArray, bedid);
    }

    // we're handling sending the frames to the DAQ in this script so send empty object back to mllp_receive
    return {
        namespace: 'acme',
        startTime: Date.now(),
        dt: 0,
        waveforms: {},
        vitals: {},
        alarms: [],
        ACK: ACK
    };
};
