const express = require('express');
const authRoutes = require('./routes/authRoutes');
const threadRoutes = require('./routes/threadRoutes');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const moderationRoutes = require('./routes/moderationRoutes');
require('dotenv').config();
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(helmet());

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));
app.use('/api/admin', adminRoutes);

// Rate limiter — uncomment in production to protect auth endpoints
// const authLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000,
//     max: 20,
//     message: { error: 'Too many requests, please try again later.' },
//     standardHeaders: true,
//     legacyHeaders: false,
// });
// app.use('/api/auth', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/threads', threadRoutes);

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
