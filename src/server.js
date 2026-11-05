// load and check .env before anything else
const env = require('./config/env');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const userStore = require('./store/userStore');

const app = express();
const PORT = env.port;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// register routes
app.use('/', authRoutes);

// sanity check route
app.get('/health', (req, res) => {
res.json({ status: 'healthy', timestamp: new Date().toISOString(), streamers: userStore.list().length });
});

// boot server
const server = app.listen(PORT, () => {
console.log(` SP-28 StreamPulse Backend running on port ${PORT}`);
console.log(` Login URL: http://localhost:${PORT}/auth/login`);
console.log(` Health: http://localhost:${PORT}/health`);
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
