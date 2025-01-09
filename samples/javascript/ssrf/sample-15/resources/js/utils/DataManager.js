class DataProvider {
  constructor() {
    this.notificationSet = {};
    // holds the active component-Ids that have a request - so that there is only 1 request per component-Id
    // also used for mapping current request with a unique ID to send an "abortion request" to the worker, when the corresponding component unmounts
    this.activeRequestsComponentIds = {};
    // tracks which component already gets unmounted (so the event won't be triggered twice)
    this.unsubscribeNotificationsIds = {};
    this.mqttInstance = null;
    this.promiseWorker = null;
    this.invalidationQueue = null;
    this.SYNC_TOPIC = '';
    this.worker = null;
    this.fetchMissedUpdatesTimeout = null;
  }

  initWorker() {
    if (this.worker) {
      this.worker.terminate();
    }
    this.worker = new Worker('/workers/worker.js');
    this.promiseWorker = new PromiseWorker(this.worker);
    this.invalidationQueue = new InvalidationQueue(this.promiseWorker);

    // initialize DB
    const user = localStorage.getItem('user');
    this.userId = JSON.parse(user).id;
    this.SYNC_TOPIC =
      'account/' + JSON.parse(user).activeAccount.id + '/_modelupdates';

    const accessToken = localStorage.getItem('access_token');
    const appUrl = window.location.origin;

    return this.promiseWorker.postMessage({
      type: 'initDB',
      id: this.userId,
      accessToken,
      appUrl: appUrl
    });
  }

  reinitDb() {
    const accessToken = localStorage.getItem('access_token');
    const appUrl = window.location.origin;

    this.promiseWorker
      .postMessage({
        type: 'initDB',
        id: this.userId,
        accessToken,
        appUrl: appUrl
      })
      .then(notify => {
        if (notify) {
          this.notifyWatchingComponents(
            { notificationSet: this.notificationSet },
            { updatedKeys: Object.keys(this.notificationSet) },
            true
          );
        }
      });
  }

  initMqtt(mqttInstance) {
    if (mqttInstance && !this.mqttInstance) {
      this.mqttInstance = mqttInstance;

      mqttInstance.unsubscribe(this.SYNC_TOPIC);
      mqttInstance.subscribe(this.SYNC_TOPIC, {
        qos: 0
      });

      mqttInstance.on(
        'message',
        this.handleMessage(
          this.notificationSet,
          this.notifyWatchingComponents,
          this.invalidationQueue,
          this.SYNC_TOPIC,
          this.promiseWorker
        )
      );
    }
  }

  unsubscribeMqtt() {
    if (this.mqttInstance) {
      this.mqttInstance.unsubscribe(this.SYNC_TOPIC);
    }
  }

  get(componentId, type, id = null, fields = '', updateCallback = () => {}) {
    return new Promise((resolve, reject) => {
      if (!type || !id) {
        reject('Invalid id or type given.');
        return;
      }
      // ensure only 1 request per component at a time
      if (
        hasRunningRequest(

  delete(path) {
    return new Promise((resolve, reject) => {
      axios
        .delete(path)
        .then(response => {
          resolve(response);
        })
        .catch(error => {
          reject(error);
        });
    });
  }
