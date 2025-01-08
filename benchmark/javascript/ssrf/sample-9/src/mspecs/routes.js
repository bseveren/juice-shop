const express = require('express');
const logger = require('../logging/logger');
const { importEstate } = require('./import');
const { flattenTree, js2XML, postProcessFlatData } = require('./mspecsUtils');

const router = new express.Router();

router.get('/import/:estateId/env/:env/token/:token', async (req, res) => {
    const start = Date.now();
    const { env, token, estateId } = req.params;

    try {
        const estate = await importEstate(env, token, estateId);
        const flatjs = flattenTree('', estate);
        const postProcessed = await postProcessFlatData(flatjs);
        const xml = js2XML(postProcessed);
        res.set('Content-Type', 'application/xml');

        logger.info('Imported estateId', {
            env,
            token,
            estateId,
            duration: Date.now() - start,
        });

        res.send(xml);
    } catch (e) {
        logger.error(e.message, ...req.params);
        res.status(500).send(e.message);
    }
});
