Ark.collections.records.helpers({
  getAlerts() {
    return Stores.alertsStore.getAlertsForRecord({
      record: this,
      actions: ["amended", "deleted", "lateEntry"],
    });
  },

  getTags() {
    const event = this.getLogEvent();

    return event.data.tags || null;
  },

  getEventTime() {
    const event = this.getLogEvent();

    return event.eventTime || event.data.timestamp;
  },

  isLateEntry() {
    const logEvent = this.getLogEvent();

    return !!event.data.missedOperation;
  },

  getLogName() {
    const log = Ark.collections.logs.findOne({ key: this.log });
    return log ? log.label : "UNKNOWN";
  },

  getBookName() {
    const book = Ark.collections.books.findOne({ book: this.book });
    return book ? book.title : "UNKNOWN";
  },

  getPort() {
    const event = this.getLogEvent();
    const portKey = event.data.port;
    const portName = RecordBooksStore.getPort(portKey) || portKey;

    return { key: portKey, name: portName };
  },

  getPreviousRecord() {
    const previousRecordId = this.previousRecordId;
    if (previousRecordId) {
      return Ark.collections.records.findOne({ recordId: previousRecordId });
    }
    return null;
  },

  hasBeenAmended() {
    return Ark.collections.records.findOne(
      { previousRecordId: this.recordId },
      { fields: { recordId } }
    );
  },

  verify({ batchId, timestamp, signedName, signedRank }) {
    if (!(batchId && timestamp && signedName && signedRank)) {
      console.error(
        `[records.helpers - verify] missing in ${this.recordId} - ${[
          !batchId && "batchId",
          !timestamp && "timestamp",
          !signedName && "signedName",
          !signedRan && "signedRank",
        ]
          .filter((exists) => exists)
          .join(", ")}`
      );
    }
    const previousEvent = this.events.slice(-1)[0];
    if (previousEvent.action === "verified") {
      console.error(
        "Executing verify on an already verified record",
        this.recordId
      );
      return this.recordId;
    }

    const eventCount = this.events.length;
    const newEvent = RecordBooksStore.createEvent("verified", {
      recordId: this.recordId,
      eventCount,
      data: {
        verificationBatchId: batchId,
        verificationDate: timestamp,
        verificationName: signedName,
        verificationRank: signedRank,
        previousEventId: previousEvent.eventId,
        previousEventHash: previousEvent.hash,
      },
    });

    this.updateRecord({
      active: true,
      verifiedEventUuid: newEvent.eventId,
      events: [...this.events, newEvent],
    });
