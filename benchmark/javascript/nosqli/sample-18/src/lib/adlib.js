Adlib.prototype.updateLastRecordWithDone = async function () {
    const maxGeneratedAtTime = await this._db.models.Member.max('generatedAtTime', {
        where: {
            institution: this._institution,
            adlibDatabase: this._adlibDatabase,
            version: process.env.npm_package_version ? process.env.npm_package_version : '0.0.0'
        }
    });
    const lastURI = await this._db.models.Member.max('URI', {
        where: {
            institution: this._institution,
            adlibDatabase: this._adlibDatabase,
            version: process.env.npm_package_version ? process.env.npm_package_version : '0.0.0',
            generatedAtTime: maxGeneratedAtTime
        }
    });
    const lastObject = await this._db.models.Member.findOne({
        where: {
            URI: lastURI,
            version: process.env.npm_package_version ? process.env.npm_package_version : '0.0.0'
        }
    });
    if (lastObject) {
        lastObject.done = true;
        await lastObject.save();
    }
}
