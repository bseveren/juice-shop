(function () {

    // nodejs
    const path = require('path'),
        fs = require('fs'),
        os = require('os');

    // express
    const express = require('express'),
        expressWs = require('express-ws'),
        compression = require('compression'),
        cookieParser = require('cookie-parser'),
        httpProxy = require('http-proxy'),
        proxy = httpProxy.createProxyServer({}),
        multer = require('multer'),
        formData = require("./middleware/formdata"),
        responseTime = require('./middleware/response-time');

    // logging
    const morgan = require('morgan');
    const ecsFormat = require('@elastic/ecs-morgan-format');

    // ***
    const *** = require('./***'),
        APIHelper = require('./helper/apihelper'),
        Metrics = require('./metrics'),
        ******Util = ***.SDK.Util,
        ******StringUtil = ***.SDK.StringUtil,
        MediaHelper = ***.SDK.MediaHelper,
        Media = ***.SDK.Media,
        MediaServer = ***.SDK.MediaServer,
        StreamingServer = require('./media/index'),
        Resumable = require('./media/resumable');

    /**
     * *** Simple Web Service
     */
    const API = (function () {

        /**
         * Simple API
         * @param options object
         * @param app express application instance
         */
        function API(options, app, server, logger) {

            this.logger = logger;
            this.app = app;
            this.httpServer = server;

            this._options = {
                // default timeout
                timeout: (1000 * 10),
                // short operation timeout
                timeout_short: (1000 * 30),
                // long operation timeout
                timeout_long: (1000 * 60 * 5),
                // extremely slow operation timeout
                timeout_extremely_long: (1000 * 60 * 30),
                baseUrl: '/ws/1.0',
                wsbaseUrl: '/ss/1.0',
                // temporary files folder
                tempDir: os.tmpdir(),
                sharedTempDir: path.join('/', 'root', 'tmp'),
                proxy: {
                    audio: {
                        uri: (process.env.******_DIST == 'dev') ? 'http://localhost:8888' : 'http://****-audio:8888'
                    },
                    dash: {
                        uri: (process.env.******_DIST == 'dev') ? 'http://localhost:8050' : 'https://*******.****farm.net:443'
                    },
                    openfaas: {
                        adsfinder: {
                            uri: 'https://openfaas-ai.*****farm.net/function/ads-finder'
                        },
                        langid: {
                            uri: 'https://openfaas-ai.****farm.net/function/language-detection'
                        },
                        photo2lyrics: {
                            uri: 'http://openfaas.ai.******farm.net/function/photo2lyrics'
                        },
                        photo2lyricsmultilingual: {
                            uri: 'http://openfaas.ai.******farm.net/function/photo2lyrics-multilingual'
                        }
                    }
                },
                logging: {
                    statusCode: 200
                },
                // override metrics options
                metrics: {
                    lynx: {
                        enabled: false,
                        //namespace: `aiapi_calls.${process.env.******_DIST}.${process.env.******_DIST_TYPE}`
                        namespace: `aiapi_calls`
                    },
                    ***: {
                        enabled: true,
                        namespace: `aiapi_calls`
                    }
                },
                websocket: {
                    enabled: false
                }
            };
            ******Util.mergeRecursive(this._options, options);

            // metrics module
            this.metrics = new Metrics(this._options.metrics, logger);

        }//API

        /**
         * Request processor
         * @param {*} fn 
         * @param {*} method 
         * @param {*} req 
         * @param {*} res 
         */
        API.prototype.processRequest = async function (params, fn, method, req, res) {
            var self = this;
            var options = {

            };
            for (var attrname in params) { options[attrname] = params[attrname]; }

            var timer;
            if (!self.isIntelligence) { // avoid double measure
                if (self._options.metrics.lynx.enabled) {
                    const api_metrics = `${self._options.metrics.lynx.namespace}.${method}`;
                    self.metrics.increment(api_metrics);
                    timer = self.metrics.createTimer(api_metrics);
                }
                if (self._options.metrics.***.enabled) {
                    self.metrics.startCall(method);
                }
            }

        API.prototype.registerStreamingEndpoint = function () {
            var self = this;

            /************************ Mediaserver API ***********************/
            self.app.get(self._options.baseUrl + '/media.status.get', async function (req, res) {
                return self.processor.getMediaServerStatus(req, res);
            });//media.status.get

            /************************
            * Audio Streaming API
            ***********************/
            self.app.get(self._options.baseUrl + '/waveform/:stream_id', async function (req, res) {
                var params = {
                    stream_id: req.params.stream_id,
                    // true to vocals audio file
                    vocals: false,
                    // true to output json, false to output png image
                    json: true,
                    // number of pixels per seconds
                    pixelsPerSecond: 100,
                    bits: 8,
                    // png width only with json false
                    width: 1800,
                    // png height only with json false
                    height: 140
                };
                try {
                    if (typeof (req.query.vocals) != 'undefined') params.vocals = ******Util.parseBool(req.query.vocals);
                    if (typeof (req.query.json) != 'undefined') params.json = ******Util.parseBool(req.query.json);
                    if (req.query.width) params.width = parseInt(req.query.width);
                    if (req.query.height) params.height = parseInt(req.query.height);
                    if (req.query.pixels_per_second) params.pixelsPerSecond = parseInt(req.query.pixels_per_second);
                    if (req.query.background_color) params.backgroundColor = req.query.background_color;
                    if (req.query.waveform_color) params.waveformColor = req.query.waveform_color;
                    if (!******Util.empty(req.query.axis_labels)) params.axisLabels = ******Util.parseBool(req.query.axis_labels);
                } catch (ex) {
                    // ignore
                }

                var wv = new ***.SDK.Waveform({ debug: self.logger.isDebug() });
                var aupath = path.join(process.env.******_AUDIO, path.sep, params.stream_id + '.mp3');

                if (******Util.parseBool(req.query.vocals)) { // vocals
                    aupath = path.join(process.env.******_AUDIO, path.sep, params.stream_id + '_vocals.mp3');
                } else if (!******Util.empty(req.query.stem) && MediaServer.STEMS[req.query.stem]) { // LP: all stems
                    var fpath = params.stream_id + MediaServer.STEMS[req.query.stem].path + '.' + MediaServer.STEMS[req.query.stem].ext;
                    aupath = path.join(process.env.******_AUDIO, path.sep, fpath);
                }
                if (******Util.parseBool(req.query.json)) { // waveform as json
                    function execute(params, resolve, reject, nocache = false) {
                        var tmppath = path.join(os.tmpdir(), params.stream_id + '.json');
                        if (******Util.parseBool(req.query.vocals)) { // vocals
                            tmppath = path.join(os.tmpdir(), params.stream_id + '_vocals.json');
                        } else if (!******Util.empty(req.query.stem) && MediaServer.STEMS[req.query.stem]) { // LP: all stems
                            var fpath = params.stream_id + MediaServer.STEMS[req.query.stem].path + '.json';
                            tmppath = path.join(os.tmpdir(), fpath);
                        }
                        var mediaHelper = new MediaHelper({}, self.logger);
                        mediaHelper.probe(aupath)
                            .then(info => {
                                var media = new Media(info);
                                var options = {};
                                if (params.pixelsPerSecond) options.pixelsPerSecond = params.pixelsPerSecond;
                                else options.end = media.duration();
                                return wv.waveform(options,
                                    aupath,
                                    tmppath);
                            })
                            .then(data => {
                                return resolve(data);
                            })
                            .catch(error => {
                                return reject(error);
                            });
                    }//execute

                    var nocache = req.query.nocache || false;
                    params.nocache = nocache;
                    params.expire = 60 * 60 * 24 * 1 * 30; // custom key expire: 1 month

                    self.getAgent().getPlatformAgent()
                        .process('waveform:' + params.stream_id, params, (params, resolve, reject) => {
                            return execute(params, resolve, reject, nocache);
                        }, (data) => {
                            res.setHeader('Content-Type', 'application/json');
                            res.send(data);
                        }, (error) => {
                            var errorMessage = APIHelper.createErrorMessage(404, '', '', error.message);
                            res.send(errorMessage);
                            res.end();
                        });
                } else { // waveform as png
                    var tmppath = path.join(os.tmpdir(), params.stream_id + '.png');
                    if (******Util.parseBool(req.query.vocals)) { // vocals
                        tmppath = path.join(os.tmpdir(), params.stream_id + '_vocals.png');
                    } else if (!******Util.empty(req.query.stem) && MediaServer.STEMS[req.query.stem]) { // LP: all stems
                        var fpath = params.stream_id + MediaServer.STEMS[req.query.stem].path + '.png';
                        tmppath = path.join(os.tmpdir(), fpath);
                    }
                    if (req.query.pixels_per_second) { // calculate waveform from parameters
                        wv.png(params,
                            aupath,
                            tmppath)
                            .then(_ => {
                                // stream png
                                var s = fs.createReadStream(tmppath);
                                s.on('open', function () {
                                    res.setHeader('Content-Type', 'image/png');
                                    s.pipe(res);
                                });
                                s.on('error', function (error) {
                                    var errorMessage = APIHelper.createErrorMessage(404, '', '', error.message);
                                    res.send(errorMessage);
                                    res.end();
                                });
                            })
                            .catch(error => {
                                var errorMessage = APIHelper.createErrorMessage(404, '', '', error.message);
                                res.send(errorMessage);
                                res.end();
                            });
                    } else { // auto detect duration and pixels per second
                        var mediaHelper = new MediaHelper({}, self.logger);
                        mediaHelper.probe(aupath)
                            .then(info => {
                                var media = new Media(info);
                                var duration = media.duration();
                                params.end = duration;
                                return wv.png(params,
                                    aupath,
                                    tmppath);
                            })
                            .then(_ => {
                                // stream png
                                var s = fs.createReadStream(tmppath);
                                s.on('open', function () {
                                    res.setHeader('Content-Type', 'image/png');
                                    s.pipe(res);
                                });
                                s.on('error', function (error) {
                                    var errorMessage = APIHelper.createErrorMessage(404, '', '', error.message);
                                    res.send(errorMessage);
                                    res.end();
                                });
                            })
                            .catch(error => {
                                var errorMessage = APIHelper.createErrorMessage(404, '', '', error.message);
                                res.send(errorMessage);
