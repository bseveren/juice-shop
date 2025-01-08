const { copyFileToPartition,  getPartitionConfigS3Object, savePartitionConfigS3Object, checkConfigExists } = require('../s3');

async function processCopyEvent(s3Event, now) {
    const bucket = decodeURIComponent(s3Event["bucket"]["name"]);
    const key = decodeURIComponent(s3Event["object"]["key"]);
    const config = getPartitionConfig(bucket, key, now);

    console.log("Partition config: \n", config);
    await copyFileToPartition(config).then(response => {
        console.log(`Copied successfully partition ${config.path} for table ${config.table} at db ${config.database} on Glue Catalog: ${response}`);
    }).catch(err => Promise.reject(err));

    const check = await checkConfigExists(config);
    if (!check) {
        await savePartitionConfigS3Object(config).catch(err => Promise.reject(err));
    }
}
