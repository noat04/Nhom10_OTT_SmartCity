const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { verifyToken } = require('../../shared/middlewares/auth.middleware');

router.get('/', verifyToken, userController.searchUsers);

module.exports = router;