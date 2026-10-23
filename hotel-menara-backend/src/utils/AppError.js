/** An error that is safe to show to API clients. */
class AppError extends Error {
  /**
   * @param {number} statusCode HTTP status code
   * @param {string} code machine readable error code, e.g. "ROOM_NOT_FOUND"
   * @param {string} message human readable message
   * @param {unknown} [details] extra information (e.g. validation issues)
   */
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

module.exports = {
  AppError,
};
