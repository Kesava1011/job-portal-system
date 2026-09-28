// Centralized error handling middleware
function errorHandler(err, req, res, next) {
  console.error('Unhandled Application Error:', err);

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

module.exports = { errorHandler };
