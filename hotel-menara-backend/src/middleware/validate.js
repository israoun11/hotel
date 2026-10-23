/**
 * Validates req.params / req.query / req.body with Zod.
 * On success the parsed (typed, coerced, trimmed) values replace the raw ones.
 * On failure the ZodError is forwarded to the error handler (HTTP 400).
 */
function validate(schemas) {
  return (req, _res, next) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  validate,
};
