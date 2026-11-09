// every error the api sends back, in plain language (srs 4.3)
const ERRORS = {
  SESSION_EXPIRED: { status: 401, message: 'Please log in with Twitch to continue.' },
  REAUTH_REQUIRED: { status: 401, message: 'Your Twitch session ended or access was removed. Please log in again.' },
  TWITCH_UNAVAILABLE: { status: 503, message: "Twitch isn't responding right now. Try again in a minute." },
  NOT_FOUND: { status: 404, message: "That API route doesn't exist." },
  RATE_LIMITED: { status: 429, message: 'Too many attempts. Please wait a minute and try again.' },
  INTERNAL: { status: 500, message: 'Something went wrong on our side. Please try again.' }
};

class AppError extends Error {
  // detail is for the server log only, it never goes to the browser
  constructor(code, detail) {
    const known = ERRORS[code] ? code : 'INTERNAL';
    super(ERRORS[known].message);
    this.code = known;
    this.status = ERRORS[known].status;
    this.detail = detail;
  }
}

module.exports = { AppError, ERRORS };