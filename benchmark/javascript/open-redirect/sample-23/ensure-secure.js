module.exports = (req, res, next) => {
    // We make sure that the /health endpoint returns 200, this is the EBS health checker
    if (req.baseUrl === "/health") {
        return res.sendStatus(200);
    }

    // If the call is already secure, just proceed
    if (req.secure || req.get("x-forwarded-proto") === "https") {
        return next();
    }

    // Not secure? Rewrite the url and proceed :partyparrot:
    res.redirect(`https://${req.hostname}${req.url}`);
};
