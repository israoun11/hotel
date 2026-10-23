/** Forwards errors thrown by async controllers to the central error handler. */
function asyncHandler(
  fn,
) {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

module.exports = {
  asyncHandler,
};
