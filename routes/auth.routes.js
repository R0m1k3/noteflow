const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { db, logger } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: { message: 'Too many login attempts, please try again later' }
});

// Login validation
const loginValidation = [
  body('username').trim().notEmpty().escape(),
  body('password').trim().notEmpty()
];

// Login route
router.post('/login', loginLimiter, loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      logger.error('Login error:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, username: user.username, is_admin: user.is_admin } });
  });
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

// Logout (client-side only, just for completeness)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;