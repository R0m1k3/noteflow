const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { db, logger } = require('../config/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// User validation rules
const userValidation = [
  body('username').trim().isLength({ min: 3 }).escape(),
  body('password').isLength({ min: 6 }),
  body('is_admin').isBoolean().optional()
];

// Get all users (admin only)
router.get('/', authMiddleware, adminMiddleware, (req, res) => {
  db.all('SELECT id, username, is_admin, created_at FROM users', (err, users) => {
    if (err) {
      logger.error('Error fetching users:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    res.json(users);
  });
});

// Create user (admin only)
router.post('/', authMiddleware, adminMiddleware, userValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password, is_admin } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)',
      [username, hash, is_admin ? 1 : 0],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ message: 'Username already exists' });
          }
          logger.error('Error creating user:', err);
          return res.status(500).json({ message: 'Server error' });
        }
        res.status(201).json({ id: this.lastID, username, is_admin });
      }
    );
  } catch (err) {
    logger.error('Password hashing error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (admin only)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const userId = req.params.id;
  const { password, is_admin } = req.body;

  // Prevent modifying the main admin user
  if (userId === '1') {
    return res.status(403).json({ message: 'Cannot modify main admin user' });
  }

  try {
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
    }
    
    if (typeof is_admin !== 'undefined') {
      db.run('UPDATE users SET is_admin = ? WHERE id = ?', [is_admin ? 1 : 0, userId]);
    }

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    logger.error('Error updating user:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const userId = req.params.id;

  // Prevent deleting the main admin user
  if (userId === '1') {
    return res.status(403).json({ message: 'Cannot delete main admin user' });
  }

  db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
    if (err) {
      logger.error('Error deleting user:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    res.json({ message: 'User deleted successfully' });
  });
});

module.exports = router;