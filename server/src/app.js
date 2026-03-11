const express = require('express');
const authRoutes = require('./routes/authRoutes');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

app.use(helmet());

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));

app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(err.statusCode || 500).json({
        error: err.message || 'Server error',
    });
});

module.exports = app;