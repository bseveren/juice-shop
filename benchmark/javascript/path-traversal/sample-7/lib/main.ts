var catchedHandleHTTPRequest = function (request, response) {
    try {
        if (typeof (backendManager) == "undefined")
            backendManager = config.require("lib/backendResolver").Backend.Manager;

        request = extendRequest(request, response);
        response = extendResponse(request, response);

        var x = request.url.substr(0, "/ws/1.1/event.post".length);
        //if ( x != "/ws/1.1/event.post") {
        //var ConnectionTracker = require("./connectionTrackingModule");
        //var x = ConnectionTracker.trackRequest(request,response);
        //if ( x > 25) {
        //    MXMLogger.error("Request truncated to " + request.getIP() + " " + Math.floor(x) );
        //    response.end();
        //    return ;
        //}
        //}
        if (typeof (config.static_files_root) == "undefined") {
            if (config.debug) MXMLogger.debug("base path: " + process.cwd() + "/static");
            config.static_files_root = process.cwd() + "/static"
        }


        fs.exists(config.static_files_root + "/robots.txt", function (exists) {
            try {
                if ((!exists || ((request.headers["user-agent"] || "").indexOf("ELB") >= 0 &&
                    backendManager.hasActiveBackends("api-app.***.com") == false &&
                    backendManager.hasActiveBackends("www.***.com") == false
                )) && request.url == "/robots.txt") {
                    MXMLogger.error("No backend active or no robots.txt file");
                    response.status_code = 503;
                    response.writeHead(503);
                    response.end();
                } else {
                    //app(request,response);

                    var res: any = handleHTTPRequest(request, response);

                    if (res == false) res = handleAuthCallback(request, response);

                    if (res == false) {
                        res = handleStaticHTTPRequest(request, response);

                        res.then((result) => {
                            if (result == false)
                                app(request, response);
                        });
                    }
                }
            } catch (e) {
                MXMLogger.dumpError(e);
                response.sendErrorPacket(500, "uncaughtException");
            }
        });
    } catch (e) {
        //if (config.debug) MXMLogger.debug('>> ' + util.inspect(e));
        response.sendErrorPacket(500, "uncaughtException");
        if (config.debug) MXMLogger.debug(e);
        // response.end();
    }
};

function handleStaticHTTPRequest(request, response): Promise<boolean> {
    var promise = new Promise<boolean>((resolve, reject) => {

        if (typeof (config.static_files_root) == "undefined") {
            if (config.debug) MXMLogger.debug("base path: " + process.cwd() + "/static");
            config.static_files_root = process.cwd() + "/static"
        }

        var uri = url.parse(request.url).pathname;
        if (config.debug) MXMLogger.debug("uri " + uri);
        var filename = path.join(config.static_files_root, uri);
        if (config.debug) MXMLogger.debug("Accessing path: " + filename);

        fs.exists(filename, function (exists) {
            if (!exists) {
                return resolve(false);
            }

            if (fs.statSync(filename).isDirectory()) filename += '/index.html';

            fs.readFile(filename, "binary", function (err, file) {
                if (err) {
                    return resolve(false);
                }
                if (uri == "/crossdomain.xml")
                    response.writeHead(200, { "Content-Type": "text/plain" });
                else
                    response.writeHead(200, { "Content-Type": mime.lookup(filename) });
                response.write(file, "binary");
                response.end();
                resolve(true);
            });
        });
    });

    return promise;
};
