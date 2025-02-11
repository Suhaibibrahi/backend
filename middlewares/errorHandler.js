// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
    console.error(err.stack); // For development; replace with a logger for production
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
  module.exports = errorHandler;
  