export default class Adlib extends Readable {
    constructor(options) {
        super({objectMode: true, highWaterMark: 10});

        this._id = options.id;
        this._adlibDatabase = options.adlibDatabase;
        this._institution = options.institution;
        this._institutionName = config[options.institution] && config[options.institution].institutionName ? config[options.institution].institutionName : "adlib";
        this._checkEuropeanaFlag = typeof options.checkEuropeanaFlag !== 'undefined' ? options.checkEuropeanaFlag : true;
        this._db = options.db;
        this._correlator = options.correlator;
        this.run();
    }
}

Adlib.prototype.run = async function () {
    const version = process.env.npm_package_version ? process.env.npm_package_version : '0.0.0';

    var institution = this._institution;
    var adlibDatabase = this._adlibDatabase;
    let lastModifiedDate = null;
    let lastPriref = null;
    let lastWasDone = false;
    let maxGeneratedAtTime = await this._db.models.Member.max('generatedAtTime', {
        where: {
            institution: institution,
            adlibDatabase: adlibDatabase,
            version: version
        }
    });
    if (maxGeneratedAtTime) {
        const lastURI = await this._db.models.Member.max('URI', {
            where: {
                institution: institution,
                adlibDatabase: adlibDatabase,
                version: version,
                generatedAtTime: maxGeneratedAtTime
            }
        });
        const lastObject = await this._db.models.Member.findOne({
            where: {
                URI: lastURI
            }
        });
        if (lastObject.done) lastWasDone = true;

        let getPrirefFromURI = null;
        try {
            if (this._institution != "adlib") {
                // Priref is after the organization reference
                // e.g. https://*****
                getPrirefFromURI = lastURI.split('/')[(lastURI.split('/').indexOf(this._institution)+1)];
            } else {
                // Priref is after agent or concept
                // e.g. https://****
                getPrirefFromURI = lastURI.split('/')[(lastURI.split('/').indexOf("id")+2)];
            }
        } catch (e) {
            Utils.log('Failed to retrieve priref for institution ' + this._institution + ' from database '  + this._adlibDatabase + ' from URI: ' + lastURI, "adlib-backend/lib/adlib.js", "INFO", this._correlator.getId());
        }
        if (getPrirefFromURI) lastPriref = getPrirefFromURI;
        // update lastModifiedDate
        lastModifiedDate = maxGeneratedAtTime;
    }

    if (lastWasDone) lastPriref = null; // don't repeat previous run to prevent duplicates
    let startFrom = 1;
    await this.fetchWithNTLMRecursively(lastModifiedDate, lastPriref, startFrom, config.adlib.limit);

    if (lastPriref) {
        Utils.log("All objects for institution " + this._institution + " from database "  + this._adlibDatabase + " from previous run are fetched from Adlib! Now retrieving objects starting from " + lastModifiedDate, "adlib-backend/lib/adlib.js:run", "INFO", this._correlator.getId());
        lastPriref = null; // reset
        await this.fetchWithNTLMRecursively(lastModifiedDate, lastPriref, startFrom, config.adlib.limit);
    }
    this.push(null);
    Utils.log("All objects are fetched for " + this._adlibDatabase + " from " + this._institution + "!", "adlib-backend/lib/adlib.js:run", "INFO", this._correlator.getId());
};
