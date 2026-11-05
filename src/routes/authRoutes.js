const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// ouath flow
router.get('/auth/login', authController.login);
router.get('/auth/callback', authController.callback);

// profile and settings
router.get('/api/user/profile', authController.getProfile);
router.post('/api/settings/overlay/regenerate', authController.regenerateOverlayKey);
router.post('/auth/logout', authController.logout);

module.exports = router;