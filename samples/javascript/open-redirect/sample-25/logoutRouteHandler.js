module.exports = function logoutRoute(req, res) {
    security.preflight(req, res).then(function() {
        switch (req.method) {
            case 'POST': 
                var clientId = (req.query.client_id) ? ("?client_id=" + req.query.client_id) : "";
                res.redirect(params.get().appUrl + "/login.html" + clientId);
                break;
            default:
                general.returnResponse(req, res, null, req.method + " method is not supported."); 
                break;
        }
    });
}
