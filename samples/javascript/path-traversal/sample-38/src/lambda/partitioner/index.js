const { processCopyEvent, processCreatePartitionFromConfigEvent } = require('./packages/partitions');

async function copyEventHandler(event, context) {
  for (record of event["Records"]) {
    console.log("processing record:\n", JSON.stringify(record));
    const s3Event = record["s3"];
    await processCopyEvent(s3Event).then().catch(err => Promise.reject(err));
  }
  return {
    statusCode: 200,
    body: "Success"
  }
};
