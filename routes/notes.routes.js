const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { db, logger } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: 'public/uploads/',
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Note validation
const noteValidation = [
  body('title').trim().notEmpty().escape(),
  body('content').trim().optional().escape(),
  body('archived').isBoolean().optional()
];

// Get all notes for user
router.get('/', authMiddleware, (req, res) => {
  const query = `
    SELECT n.*, 
           GROUP_CONCAT(t.id || ':' || t.text || ':' || t.completed) as todos,
           GROUP_CONCAT(i.id || ':' || i.filename) as images
    FROM notes n
    LEFT JOIN todos t ON n.id = t.note_id
    LEFT JOIN images i ON n.id = i.note_id
    WHERE n.user_id = ?
    GROUP BY n.id
    ORDER BY n.created_at DESC
  `;

  db.all(query, [req.user.id], (err, notes) => {
    if (err) {
      logger.error('Error fetching notes:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    // Process the results to format todos and images
    const processedNotes = notes.map(note => ({
      ...note,
      todos: note.todos ? note.todos.split(',').map(todo => {
        const [id, text, completed] = todo.split(':');
        return { id, text, completed: completed === '1' };
      }) : [],
      images: note.images ? note.images.split(',').map(image => {
        const [id, filename] = image.split(':');
        return { id, filename };
      }) : []
    }));

    res.json(processedNotes);
  });
});

// Create note
router.post('/', authMiddleware, noteValidation, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, content, todos = [] } = req.body;

  db.run(
    'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
    [req.user.id, title, content],
    function(err) {
      if (err) {
        logger.error('Error creating note:', err);
        return res.status(500).json({ message: 'Server error' });
      }

      const noteId = this.lastID;

      // Insert todos if any
      if (todos.length > 0) {
        const todoValues = todos.map((todo, index) => 
          `(${noteId}, '${todo.text}', ${todo.completed ? 1 : 0}, ${index})`
        ).join(',');

        db.run(`INSERT INTO todos (note_id, text, completed, position) VALUES ${todoValues}`);
      }

      res.status(201).json({ id: noteId, title, content, todos: [] });
    }
  );
});

// Update note
router.put('/:id', authMiddleware, noteValidation, (req, res) => {
  const noteId = req.params.id;
  const { title, content, archived, todos = [] } = req.body;

  db.run(
    'UPDATE notes SET title = ?, content = ?, archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
    [title, content, archived ? 1 : 0, noteId, req.user.id],
    function(err) {
      if (err) {
        logger.error('Error updating note:', err);
        return res.status(500).json({ message: 'Server error' });
      }

      // Update todos
      db.run('DELETE FROM todos WHERE note_id = ?', [noteId], (err) => {
        if (err) {
          logger.error('Error deleting todos:', err);
          return;
        }

        if (todos.length > 0) {
          const todoValues = todos.map((todo, index) => 
            `(${noteId}, '${todo.text}', ${todo.completed ? 1 : 0}, ${index})`
          ).join(',');

          db.run(`INSERT INTO todos (note_id, text, completed, position) VALUES ${todoValues}`);
        }
      });

      res.json({ message: 'Note updated successfully' });
    }
  );
});

// Delete note
router.delete('/:id', authMiddleware, (req, res) => {
  const noteId = req.params.id;

  db.run('DELETE FROM notes WHERE id = ? AND user_id = ?', [noteId, req.user.id], (err) => {
    if (err) {
      logger.error('Error deleting note:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    // Cleanup related records
    db.run('DELETE FROM todos WHERE note_id = ?', [noteId]);
    db.run('DELETE FROM images WHERE note_id = ?', [noteId]);

    res.json({ message: 'Note deleted successfully' });
  });
});

// Upload image
router.post('/:id/images', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided' });
  }

  const noteId = req.params.id;
  const filename = req.file.filename;

  db.run(
    'INSERT INTO images (note_id, filename) VALUES (?, ?)',
    [noteId, filename],
    function(err) {
      if (err) {
        logger.error('Error saving image record:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      res.status(201).json({ id: this.lastID, filename });
    }
  );
});

// Delete image
router.delete('/:noteId/images/:imageId', authMiddleware, (req, res) => {
  const { noteId, imageId } = req.params;

  db.run(
    'DELETE FROM images WHERE id = ? AND note_id = ?',
    [imageId, noteId],
    (err) => {
      if (err) {
        logger.error('Error deleting image:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      res.json({ message: 'Image deleted successfully' });
    }
  );
});

module.exports = router;