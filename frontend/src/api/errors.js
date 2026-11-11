// errors the screens can show as they are, the backend already sends plain-language messages
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}