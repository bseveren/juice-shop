'use strict'

const express = require('express')

const router = new express.Router()
const userController = require('../controllers/user')
const imagesController = require('../controllers/images')

router.post('/modifyimage', userController.requireLogin, userController.checkCaptcha, imagesController.getAndModify)
