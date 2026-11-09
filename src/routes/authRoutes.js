const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// oauth flow
router.get('/auth/login', authController.login);
router.get('/auth/callback', authController.callback);
router.post('/auth/logout', authController.logout);

module.exports = router;