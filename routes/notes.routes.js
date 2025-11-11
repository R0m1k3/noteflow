// Routes de gestion des notes
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');

const { getAll, getOne, runQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../config/logger');

// Configuration de multer pour l'upload d'images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../public/uploads');
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé. Utilisez JPEG, PNG, WebP ou GIF.'));
    }
  }
});

// Toutes les routes nécessitent authentification
router.use(authenticateToken);

/**
 * GET /api/notes?archived=true/false
 * Liste toutes les notes de l'utilisateur
 */
router.get('/', async (req, res) => {
  try {
    const showArchived = req.query.archived === 'true';
    const archivedFilter = showArchived ? 1 : 0;

    const notes = await getAll(`
      SELECT
        n.id, n.title, n.content, n.image_filename, n.archived,
        n.created_at, n.updated_at,
        (SELECT COUNT(*) FROM note_todos WHERE note_id = n.id) as todos_count,
        (SELECT COUNT(*) FROM note_todos WHERE note_id = n.id AND completed = 1) as todos_completed
      FROM notes n
      WHERE n.user_id = ? AND n.archived = ?
      ORDER BY n.updated_at DESC
    `, [req.user.id, archivedFilter]);

    // Charger les todos et fichiers pour chaque note
    for (const note of notes) {
      const todos = await getAll(`
        SELECT id, text, completed, position
        FROM note_todos
        WHERE note_id = ?
        ORDER BY position ASC, id ASC
      `, [note.id]);
      note.todos = todos || [];

      const files = await getAll(`
        SELECT id, filename, original_name, file_size, mime_type, created_at
        FROM note_files
        WHERE note_id = ?
        ORDER BY created_at DESC
      `, [note.id]);
      note.files = files || [];
      note.files_count = files?.length || 0;
    }

    res.json(notes || []);
  } catch (error) {
    logger.error('Erreur lors de la récupération des notes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/notes/:id
 * Récupérer une note avec ses todos
 */
router.get('/:id', async (req, res) => {
  try {
    const note = await getOne(`
      SELECT id, title, content, image_filename, created_at, updated_at
      FROM notes
      WHERE id = ? AND user_id = ?
    `, [req.params.id, req.user.id]);

    if (!note) {
      return res.status(404).json({ error: 'Note non trouvée' });
    }

    // Récupérer les todos de la note
    const todos = await getAll(`
      SELECT id, text, completed, position
      FROM note_todos
      WHERE note_id = ?
      ORDER BY position, id
    `, [req.params.id]);

    note.todos = todos;

    res.json(note);
  } catch (error) {
    logger.error('Erreur lors de la récupération de la note:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/notes
 * Créer une nouvelle note
 */
router.post('/',
  [
    body('title').trim().notEmpty().withMessage('Le titre est requis'),
    body('content').optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Données invalides', details: errors.array() });
      }

      const { title, content } = req.body;

      const result = await runQuery(`
        INSERT INTO notes (user_id, title, content)
        VALUES (?, ?, ?)
      `, [req.user.id, title, content || '']);

      logger.info(`Note créée: ${title} (ID: ${result.id}) par ${req.user.username}`);

      res.status(201).json({
        id: result.id,
        title,
        content: content || '',
        image_filename: null,
        todos: []
      });
    } catch (error) {
      logger.error('Erreur lors de la création de la note:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

/**
 * PUT /api/notes/:id
 * Modifier une note
 */
router.put('/:id',
  [
    body('title').optional().trim().notEmpty(),
    body('content').optional()
  ],
  async (req, res) => {
    try {
      const { title, content } = req.body;

      // Vérifier que la note appartient à l'utilisateur
      const note = await getOne('SELECT id FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
      if (!note) {
        return res.status(404).json({ error: 'Note non trouvée' });
      }

      const updates = [];
      const params = [];

      if (title !== undefined) {
        updates.push('title = ?');
        params.push(title);
      }
      if (content !== undefined) {
        updates.push('content = ?');
        params.push(content);
      }

      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(req.params.id);

        await runQuery(`UPDATE notes SET ${updates.join(', ')} WHERE id = ?`, params);
      }

      res.json({ message: 'Note modifiée avec succès' });
    } catch (error) {
      logger.error('Erreur lors de la modification de la note:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

/**
 * PUT /api/notes/:id/archive
 * Archiver ou désarchiver une note
 */
router.put('/:id/archive', async (req, res) => {
  try {
    const { archived } = req.body;

    // Vérifier que la note appartient à l'utilisateur
    const note = await getOne('SELECT id FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!note) {
      return res.status(404).json({ error: 'Note non trouvée' });
    }

    await runQuery(
      'UPDATE notes SET archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [archived ? 1 : 0, req.params.id]
    );

    logger.info(`Note ${archived ? 'archivée' : 'désarchivée'}: ${req.params.id}`);
    res.json({ message: `Note ${archived ? 'archivée' : 'désarchivée'} avec succès`, archived });
  } catch (error) {
    logger.error('Erreur lors de l\'archivage de la note:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/notes/:id
 * Supprimer une note
 */
router.delete('/:id', async (req, res) => {
  try {
    // Vérifier que la note appartient à l'utilisateur
    const note = await getOne('SELECT id, image_filename FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!note) {
      return res.status(404).json({ error: 'Note non trouvée' });
    }

    // Supprimer l'image si elle existe
    if (note.image_filename) {
      const imagePath = path.join(__dirname, '../public/uploads', note.image_filename);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await runQuery('DELETE FROM notes WHERE id = ?', [req.params.id]);

    logger.info(`Note supprimée (ID: ${req.params.id}) par ${req.user.username}`);

    res.json({ message: 'Note supprimée avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la suppression de la note:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/notes/:id/image
 * Ajouter une image à une note
 */
router.post('/:id/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image fournie' });
    }

    // Vérifier que la note appartient à l'utilisateur
    const note = await getOne('SELECT id, image_filename FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!note) {
      // Supprimer le fichier uploadé
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Note non trouvée' });
    }

    // Supprimer l'ancienne image si elle existe
    if (note.image_filename) {
      const oldImagePath = path.join(__dirname, '../public/uploads', note.image_filename);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Mettre à jour la note avec le nouveau fichier
    await runQuery('UPDATE notes SET image_filename = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.file.filename, req.params.id]);

    res.json({
      message: 'Image ajoutée avec succès',
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`
    });
  } catch (error) {
    logger.error('Erreur lors de l\'ajout de l\'image:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/notes/:id/image
 * Supprimer l'image d'une note
 */
router.delete('/:id/image', async (req, res) => {
  try {
    const note = await getOne('SELECT id, image_filename FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!note) {
      return res.status(404).json({ error: 'Note non trouvée' });
    }

    if (!note.image_filename) {
      return res.status(400).json({ error: 'Aucune image à supprimer' });
    }

    // Supprimer le fichier
    const imagePath = path.join(__dirname, '../public/uploads', note.image_filename);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    await runQuery('UPDATE notes SET image_filename = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);

    res.json({ message: 'Image supprimée avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la suppression de l\'image:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/notes/:id/todos
 * Ajouter un todo à une note
 */
router.post('/:id/todos',
  [body('text').trim().notEmpty().withMessage('Le texte est requis')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Données invalides', details: errors.array() });
      }

      // Vérifier que la note appartient à l'utilisateur
      const note = await getOne('SELECT id FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
      if (!note) {
        return res.status(404).json({ error: 'Note non trouvée' });
      }

      const { text } = req.body;

      const result = await runQuery(`
        INSERT INTO note_todos (note_id, text, position)
        VALUES (?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM note_todos WHERE note_id = ?))
      `, [req.params.id, text, req.params.id]);

      await runQuery('UPDATE notes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);

      res.status(201).json({
        id: result.id,
        text,
        completed: false,
        position: 0
      });
    } catch (error) {
      logger.error('Erreur lors de l\'ajout du todo:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

/**
 * PUT /api/notes/todos/:todoId
 * Modifier un todo dans une note
 */
router.put('/todos/:todoId',
  [
    body('text').optional().trim().notEmpty(),
    body('completed').optional().isBoolean(),
    body('position').optional().isInt()
  ],
  async (req, res) => {
    try {
      const { text, completed, position } = req.body;

      // Vérifier que le todo appartient à une note de l'utilisateur
      const todo = await getOne(`
        SELECT nt.id, nt.note_id
        FROM note_todos nt
        JOIN notes n ON nt.note_id = n.id
        WHERE nt.id = ? AND n.user_id = ?
      `, [req.params.todoId, req.user.id]);

      if (!todo) {
        return res.status(404).json({ error: 'Todo non trouvé' });
      }

      const updates = [];
      const params = [];

      if (text !== undefined) {
        updates.push('text = ?');
        params.push(text);
      }
      if (completed !== undefined) {
        updates.push('completed = ?');
        params.push(completed ? 1 : 0);
      }
      if (position !== undefined) {
        updates.push('position = ?');
        params.push(position);
      }

      if (updates.length > 0) {
        params.push(req.params.todoId);
        await runQuery(`UPDATE note_todos SET ${updates.join(', ')} WHERE id = ?`, params);
        await runQuery('UPDATE notes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [todo.note_id]);
      }

      res.json({ message: 'Todo modifié avec succès' });
    } catch (error) {
      logger.error('Erreur lors de la modification du todo:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

/**
 * DELETE /api/notes/todos/:todoId
 * Supprimer un todo d'une note
 */
router.delete('/todos/:todoId', async (req, res) => {
  try {
    // Vérifier que le todo appartient à une note de l'utilisateur
    const todo = await getOne(`
      SELECT nt.id, nt.note_id
      FROM note_todos nt
      JOIN notes n ON nt.note_id = n.id
      WHERE nt.id = ? AND n.user_id = ?
    `, [req.params.todoId, req.user.id]);

    if (!todo) {
      return res.status(404).json({ error: 'Todo non trouvé' });
    }

    await runQuery('DELETE FROM note_todos WHERE id = ?', [req.params.todoId]);
    await runQuery('UPDATE notes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [todo.note_id]);

    res.json({ message: 'Todo supprimé avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la suppression du todo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/search
 * Rechercher des notes
 */
const searchNotes = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.trim().length === 0) {
      return res.json([]);
    }

    const searchTerm = `%${query}%`;

    const notes = await getAll(`
      SELECT id, title, content, image_filename, created_at, updated_at
      FROM notes
      WHERE user_id = ? AND (title LIKE ? OR content LIKE ?)
      ORDER BY updated_at DESC
      LIMIT 50
    `, [req.user.id, searchTerm, searchTerm]);

    res.json(notes);
  } catch (error) {
    logger.error('Erreur lors de la recherche:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ==================== FILE ATTACHMENTS ====================

// Configuration multer pour tous types de fichiers
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const filesDir = path.join(__dirname, '../public/uploads/files');
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }
    cb(null, filesDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const fileUpload = multer({
  storage: fileStorage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 } // 10MB
});

/**
 * POST /api/notes/:id/files
 * Ajouter un fichier à une note
 */
router.post('/:id/files', fileUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    // Vérifier que la note appartient à l'utilisateur
    const note = await getOne('SELECT id FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!note) {
      // Supprimer le fichier uploadé
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Note non trouvée' });
    }

    // Enregistrer le fichier dans la base de données
    const result = await runQuery(`
      INSERT INTO note_files (note_id, filename, original_name, file_size, mime_type)
      VALUES (?, ?, ?, ?, ?)
    `, [req.params.id, req.file.filename, req.file.originalname, req.file.size, req.file.mimetype]);

    // Mettre à jour la date de modification de la note
    await runQuery('UPDATE notes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);

    logger.info(`Fichier ajouté à la note ${req.params.id}: ${req.file.originalname}`);

    res.json({
      message: 'Fichier ajouté avec succès',
      file: {
        id: result.id,
        filename: req.file.filename,
        original_name: req.file.originalname,
        file_size: req.file.size,
        mime_type: req.file.mimetype
      }
    });
  } catch (error) {
    logger.error('Erreur lors de l\'ajout du fichier:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/notes/:id/files
 * Liste les fichiers d'une note
 */
router.get('/:id/files', async (req, res) => {
  try {
    // Vérifier que la note appartient à l'utilisateur
    const note = await getOne('SELECT id FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!note) {
      return res.status(404).json({ error: 'Note non trouvée' });
    }

    const files = await getAll(`
      SELECT id, filename, original_name, file_size, mime_type, created_at
      FROM note_files
      WHERE note_id = ?
      ORDER BY created_at DESC
    `, [req.params.id]);

    res.json(files);
  } catch (error) {
    logger.error('Erreur lors de la récupération des fichiers:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/notes/files/:fileId/download
 * Télécharger un fichier
 */
router.get('/files/:fileId/download', async (req, res) => {
  try {
    // Vérifier que le fichier appartient à une note de l'utilisateur
    const file = await getOne(`
      SELECT nf.id, nf.filename, nf.original_name, nf.mime_type
      FROM note_files nf
      JOIN notes n ON nf.note_id = n.id
      WHERE nf.id = ? AND n.user_id = ?
    `, [req.params.fileId, req.user.id]);

    if (!file) {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }

    const filePath = path.join(__dirname, '../public/uploads/files', file.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier physique non trouvé' });
    }

    res.download(filePath, file.original_name);
  } catch (error) {
    logger.error('Erreur lors du téléchargement du fichier:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/notes/files/:fileId
 * Supprimer un fichier
 */
router.delete('/files/:fileId', async (req, res) => {
  try {
    // Vérifier que le fichier appartient à une note de l'utilisateur
    const file = await getOne(`
      SELECT nf.id, nf.note_id, nf.filename
      FROM note_files nf
      JOIN notes n ON nf.note_id = n.id
      WHERE nf.id = ? AND n.user_id = ?
    `, [req.params.fileId, req.user.id]);

    if (!file) {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }

    // Supprimer le fichier physique
    const filePath = path.join(__dirname, '../public/uploads/files', file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Supprimer de la base de données
    await runQuery('DELETE FROM note_files WHERE id = ?', [req.params.fileId]);

    // Mettre à jour la date de modification de la note
    await runQuery('UPDATE notes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [file.note_id]);

    logger.info(`Fichier supprimé: ${file.filename}`);

    res.json({ message: 'Fichier supprimé avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la suppression du fichier:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
module.exports.searchNotes = searchNotes;
