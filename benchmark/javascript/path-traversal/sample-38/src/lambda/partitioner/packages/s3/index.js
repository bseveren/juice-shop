function getSavePartitionParams(config, now) {
    // if (!now) now = new Date();
    // const timestamp = now.toISOString().replace(/:|-/g,'_');
    return {
        Bucket: config.target.bucket,
        // Key: path.join('configs', 'partitions', config.database, config.table, `${timestamp}_${config.filename}.partition.config${config.extension}`),
        Key: path.join('configs', 'partitions', config.database, config.table, ...config.partitions, `partition.config${config.extension}`),
        Body: JSON.stringify(config)
    }
}

async function savePartitionConfigS3Object(config) {
    const params = getSavePartitionParams(config);
    return new Promise(async (resolve, reject) => {
        console.log(`Saving partition config to ${params.Bucket}/${params.Key}`);
        s3.upload(params, (err, data) => {
            if (err) reject(new Error(`Error saving partition config to ${params.Bucket}/${params.Key}: ${err}`));
            resolve(data);
        });
    });
}
