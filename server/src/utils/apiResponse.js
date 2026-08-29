function success(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function failure(res, message, status = 400, details = undefined) {
  const error = { message, status };
  if (details !== undefined) error.details = details;
  return res.status(status).json({ success: false, error });
}

module.exports = { success, failure };
