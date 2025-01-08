export async function handler(event) {
  console.log("Dispatcher starting...");

  const batchItemFailures = [];
  const failedIds = [];
  let counterBatch = 0;

  for (const record of event.Records) {
    counterBatch++;
    console.log("Batch item num: " + counterBatch);

    if (failedIds.includes(record.attributes.MessageGroupId)) {
      console.log(
        "Record not processed, as partned id has already failed records: " +
        JSON.stringify(record)
      );
      batchItemFailures.push({ itemIdentifier: record.messageId });
      continue;
    }

    try {
      console.log(
        "Approximate receive count: " +
        record.attributes.ApproximateReceiveCount
      );

      await processMessage(record);
      console.log("Processed message:", JSON.stringify(record));
    } catch (error) {
      console.log(
        "Error processing message:" +
        JSON.stringify(record) +
        ", error:" +
        error
      );
      batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
      failedIds.push(record.attributes.MessageGroupId);
    }
  }

  console.log("Batch item fails:" + JSON.stringify(batchItemFailures));
  return { batchItemFailures: batchItemFailures };
}

async function processMessage(record) {
  const partnerUri = record.messageAttributes["uri"].stringValue;
  const eventId = Date.now().toString() + Math.floor(1000 + Math.random() * 9999).toString();
  const requestbody = {
    eventId: eventId,
    eventType: record.messageAttributes["topic"].stringValue,
    customerId: record.messageAttributes["customerId"].stringValue,
    cuid: record.messageAttributes["cuid"]?.stringValue || null,
    timestamp: Math.floor(new Date().getTime() / 1000).toString(),
    payload: record.body,
  };
  const hmacHeader = await createHMAC(JSON.stringify(requestbody), record.messageAttributes["secretArn"].stringValue);

  let body, statusCode;
  try {
    ({ body, statusCode } = await got.post({
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Id":
          record.messageAttributes["webhookId"].stringValue,
        "X-Signature": hmacHeader,
      },
      url: partnerUri,
      json: requestbody,
      responseType: "json",
      timeout: {
        response: 5000,
      },
      throwHttpErrors: false,
    }));

    console.log("Statuscode: " + statusCode);
    if (statusCode === 202) {
      console.log("Received HTTP 202 response:", JSON.stringify(body));
      callWebhookTransaction(record, eventId);
    } else {
      throw new Error("Unexpected HTTP status code:" + statusCode);
    }
  } catch (error) {
    if (record.attributes.ApproximateReceiveCount >= RETRY_AMOUNT_MAX) {
      console.log("Request ended up in error: " + error);
      callDisableWebhook(record);
      sendToDLQ(record);
      console.log(
        "Webhook disabled, record sent to DLQ:" +
        JSON.stringify(record.messageAttributes)
      );
      return;
    } else {
      throw new Error(
        "Error calling partner url: " +
        error +
        ", body: " +
        body +
        " , statuscode: " +
        statusCode
      );
    }
  }
}
