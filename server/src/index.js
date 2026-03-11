const express = require('express');
const authRoutes = require("./routes/authRoutes");
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
// Include rest of routes

const app = express();
const PORT = process.env.PORT || 5000;


// Middleware
app.use(helmet());

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
}));

app.use(morgan('dev'));

app.use(express.json({limit: '10kb'}));
// Include rest of routing logic
app.use("/auth", authRoutes);

// Checking endpoint
app.get('/api/health', (req, res) => {
    res.json({status: 'ok', timestamp: new Date().toISOString()});
});

// Middleware error management
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(err.statusCode || 500).json({
        error: err.message || 'Server error',
    });
});

app.listen(PORT, () => {
    console.log(`Chunters' server is running on port ${PORT}`);
});

module.exports = app;