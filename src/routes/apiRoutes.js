const express = require('express');
const router = express.Router();
const { requireSession } = require('../middleware/session');
const { AppError } = require('../utils/errors');
const account = require('../controllers/accountController');

// everything under /api needs a logged in streamer (srs 4.1)
router.use(requireSession);

router.get('/me', account.getMe);
router.get('/user/profile', account.getMe); // old name from the first auth pr

router.get('/overlay', account.getOverlay);
router.post('/overlay/regenerate', account.regenerateOverlay);
router.post('/settings/overlay/regenerate', account.regenerateOverlay); // name used in the sdd

router.post('/account/disconnect', account.disconnect);
router.post('/settings/disconnect', account.disconnect); // name used in the sdd
router.delete('/account', account.deleteAccount);

// unknown /api route -> json 404 instead of html
router.use((req, res, next) => next(new AppError('NOT_FOUND')));

module.exports = router;