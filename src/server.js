
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// register routes
app.use('/', authRoutes);


// sanity check route
app.get('/health', (req, res) => {
res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});


// boot server
app.listen(PORT, () => {
console.log(`                                                                                                                                             `);
console.log(` SP-28 StreamPulse Backend running on port ${PORT}`);
console.log(` Login URL: http://localhost:${PORT}/auth/login`);
console.log(` Health: http://localhost:${PORT}/health`);
console.log(`                                                                                                                                             `);
});