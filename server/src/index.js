const express = require('express');
const cors = require('cors');

require('dotenv').config();
if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined.");
  process.exit(1);
}

// Import your routes
const authRoutes = require('./routes/authRoutes');

const app = express();

// 1. IMPORTANT: Move Middleware to the TOP
// This allows the frontend (Port 3000) to talk to the backend (Port 5050)
app.use(cors()); 

// This allows Express to "read" the JSON data you send from the Sign Up form
app.use(express.json()); 

// 2. Routing
// This mounts your routes at /api/auth
// Example: http://localhost:5050/api/auth/signup
console.log("🛠  Mounting Auth Routes at /api/auth...");
app.use('/api/auth', authRoutes);

// 3. Health Check
// Visit http://localhost:5050/ in your browser to see if the server is alive
app.get('/', (req, res) => {
  res.send('🐊 Chunters API is running on Port 5050...');
});

// 4. Start the Server
// We are hardcoding 5050 here to avoid the macOS AirPlay conflict on 5000
const PORT = process.env.PORT || 5050;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server is flying on http://localhost:${PORT}`);
  console.log("Press Ctrl+C to stop.");
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Try killing the ghost process with: killall -9 node`);
  } else {
    console.error('❌ Server failed to start:', err);
  }
});