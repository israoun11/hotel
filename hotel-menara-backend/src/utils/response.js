function sendSuccess(res, data, status = 200, meta) {
  res.status(status).json(meta ? { success: true, data, meta } : { success: true, data });
}

module.exports = {
  sendSuccess,
};
