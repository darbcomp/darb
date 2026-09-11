const buildHealthResponse = (databaseConnected) => ({
  statusCode: databaseConnected ? 200 : 503,
  body: {
    success: databaseConnected,
    message: databaseConnected ? "Darb API is ready" : "Darb API is running but not ready",
    database: databaseConnected ? "connected" : "disconnected",
  },
});

module.exports = { buildHealthResponse };
