const express = require('express');
const router = express.Router();
const exampleController = require('./controllers/exampleController');

// some secret here: ****
router.get('/example', exampleController.exampleEndpoint);
