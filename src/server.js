const env = require('./config/env');
const app = require('./app');
const userStore = require('./store/userStore');

const PORT = env.port;

// boot server
const server = app.listen(PORT, () => {
  console.log(` SP-28 StreamPulse Backend running on port ${PORT}`);
  console.log(` Login: http://localhost:${PORT}/auth/login`);
  console.log(` Health: http://localhost:${PORT}/health`);
  console.log(` After login you'll be sent to: ${env.frontendUrl}/dashboard`);
});

// save the store before exiting so nothing written in the last 250ms is lost
const shutdown = (signal) => {
  console.log(`\n[Server] ${signal} received, saving data and shutting down...`);
  userStore.flush();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// nodemon restarts with SIGUSR2, save first then let it restart
process.once('SIGUSR2', () => {
  userStore.flush();
  process.kill(process.pid, 'SIGUSR2');
});
