const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { logger } = require('./config/database');

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/notes', require('./routes/notes.routes'));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 2222;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});