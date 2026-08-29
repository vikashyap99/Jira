const { failure } = require('../utils/apiResponse');

function notFound(req, res) {
  return failure(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

function errorHandler(err, req, res, _next) {
  console.error('[error]', err);

  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message);
    return failure(res, 'Validation failed', 400, details);
  }

  if (err.code === 11000) {
    return failure(res, 'Duplicate value error', 409);
  }

  if (err.name === 'CastError') {
    return failure(res, 'Invalid identifier format', 400);
  }

  return failure(res, err.message || 'Internal server error', err.status || 500);
}

module.exports = { notFound, errorHandler };
