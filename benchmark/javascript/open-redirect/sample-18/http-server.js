const app = require('express')()
/*var http = require("http");
var https = require("https");

// configuration ===============================================================
app.enable('trust proxy'); //needed if you're behind a load balancer

http.createServer(app.handle.bind(app)).listen(process.env.HTTP_PORT ? process.env.HTTP_PORT : 8080);*/
if(process.env.NODE_ENV === 'production'){
	app.listen(process.env.HTTP_PORT ? process.env.HTTP_PORT : 8080);
}

app.use(function(req, res, next) {

	if(process.env.NODE_ENV !== 'production'){
		return next()
	}
	if (req.secure){
		return next();
	}
	res.redirect("https://" + req.headers.host + req.url);
});
