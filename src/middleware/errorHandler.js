const { AppError } = require('../utils/errors');

// axios errors from twitch --> our own error codes
function toAppError(err) {
  if (err instanceof AppError) return err;
  const status = err.response && err.response.status;
  if (status === 401) return new AppError('REAUTH_REQUIRED', err.response.data);
  if (status === 429 || status >= 500 || (err.isAxiosError && !err.response)) {
    return new AppError('TWITCH_UNAVAILABLE', (err.response && err.response.data) || err.message);
  }
  return new AppError('INTERNAL', err.stack || err.message);
}

// last middleware in app.js, express 5 sends rejected async handlers here too
// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  const appErr = toAppError(err);
  if (appErr.status >= 500 || appErr.code === 'REAUTH_REQUIRED') {
    console.error(`[${req.method} ${req.path}] ${appErr.code}:`, appErr.detail || '');
  }
  if (res.headersSent) return;
  res.status(appErr.status).json({ error: appErr.code, message: appErr.message });
};

module.exports.toAppError = toAppError;