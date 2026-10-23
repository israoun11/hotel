function isDuplicateKeyError(error) {
  return typeof error === "object" && error !== null && error.code === 11000;
}

module.exports = {
  isDuplicateKeyError,
};
