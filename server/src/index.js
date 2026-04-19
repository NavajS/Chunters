const app = require('./app');
require('dotenv').config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'add_secret_jwt_key') {
  console.error('FATAL: JWT_SECRET must be set to a real random secret in .env');
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop.');
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
  } else {
    console.error('Server failed to start:', err);
  }
});
