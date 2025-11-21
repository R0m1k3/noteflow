// Routes de gestion des todos globaux (sidebar)
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const { getAll, getOne, runQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../config/logger');

// Toutes les routes nécessitent authentification
router.use(authenticateToken);

/**
 * GET /api/todos
 * Liste tous les todos globaux de l'utilisateur
 */
router.get('/', async (req, res) => {
  try {
    const todos = await getAll(`
      SELECT id, text, completed, priority, created_at
      FROM global_todos
      WHERE user_id = $1
      ORDER BY priority DESC, created_at DESC
    `, [req.user.id]);

    res.json(todos);
  } catch (error) {
    logger.error('Erreur lors de la récupération des todos:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/todos
 * Créer un nouveau todo global
 */
router.post('/',
  [body('text').trim().notEmpty().withMessage('Le texte est requis')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Données invalides', details: errors.array() });
      }

      const { text } = req.body;

      logger.info(`[CREATE GLOBAL TODO] Début création - user_id: ${req.user.id}, text: "${text}"`);

      const result = await runQuery(`
        INSERT INTO global_todos (user_id, text)
        VALUES ($1, $2)
        RETURNING *
      `, [req.user.id, text]);

      logger.info(`[CREATE GLOBAL TODO] Todo global créé avec succès - ID: ${result.id}, user: ${req.user.username}`);

      res.status(201).json({
        id: result.id,
        text,
        completed: false,
        priority: false,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Erreur lors de la création du todo:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

/**
 * PUT /api/todos/:id
 * Modifier un todo global
 */
router.put('/:id',
  [
    body('text').optional().trim().notEmpty(),
    body('completed').optional().isBoolean(),
    body('priority').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Données invalides', details: errors.array() });
      }

      const { text, completed, priority } = req.body;

      // Vérifier que le todo appartient à l'utilisateur
      const todo = await getOne('SELECT id FROM global_todos WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      if (!todo) {
        return res.status(404).json({ error: 'Todo non trouvé' });
      }

      const updates = [];
      const params = [];
      let paramCount = 0;

      if (text !== undefined) {
        paramCount++;
        updates.push(`text = $${paramCount}`);
        params.push(text);
      }
      if (completed !== undefined) {
        paramCount++;
        updates.push(`completed = $${paramCount}`);
        params.push(completed ? 1 : 0);
      }
      if (priority !== undefined) {
        paramCount++;
        updates.push(`priority = $${paramCount}`);
        params.push(priority ? 1 : 0);
      }

      if (updates.length > 0) {
        paramCount++;
        params.push(req.params.id);
        await runQuery(`UPDATE global_todos SET ${updates.join(', ')} WHERE id = $${paramCount}`, params);
      }

      res.json({ message: 'Todo modifié avec succès' });
    } catch (error) {
      logger.error('Erreur lors de la modification du todo:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

/**
 * PATCH /api/todos/:id/toggle
 * Basculer l'état completed d'un todo
 */
router.patch('/:id/toggle', async (req, res) => {
  try {
    // Vérifier que le todo appartient à l'utilisateur
    const todo = await getOne('SELECT id, completed FROM global_todos WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!todo) {
      return res.status(404).json({ error: 'Todo non trouvé' });
    }

    const newCompleted = todo.completed ? 0 : 1;
    await runQuery('UPDATE global_todos SET completed = $1 WHERE id = $2', [newCompleted, req.params.id]);

    logger.info(`Todo global ${newCompleted ? 'complété' : 'réouvert'} (ID: ${req.params.id}) par ${req.user.username}`);

    res.json({ message: 'Todo modifié avec succès', completed: newCompleted === 1 });
  } catch (error) {
    logger.error('Erreur lors du toggle du todo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PATCH /api/todos/:id/priority
 * Basculer l'état priority d'un todo
 */
router.patch('/:id/priority', async (req, res) => {
  try {
    // Vérifier que le todo appartient à l'utilisateur
    const todo = await getOne('SELECT id, priority FROM global_todos WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!todo) {
      return res.status(404).json({ error: 'Todo non trouvé' });
    }

    const newPriority = todo.priority ? 0 : 1;
    await runQuery('UPDATE global_todos SET priority = $1 WHERE id = $2', [newPriority, req.params.id]);

    logger.info(`Todo global ${newPriority ? 'marqué prioritaire' : 'démarqué prioritaire'} (ID: ${req.params.id}) par ${req.user.username}`);

    res.json({ message: 'Priorité modifiée avec succès', priority: newPriority === 1 });
  } catch (error) {
    logger.error('Erreur lors du toggle de la priorité:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/todos/:id
 * Supprimer un todo global
 */
router.delete('/:id', async (req, res) => {
  try {
    // Vérifier que le todo appartient à l'utilisateur
    const todo = await getOne('SELECT id FROM global_todos WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!todo) {
      return res.status(404).json({ error: 'Todo non trouvé' });
    }

    await runQuery('DELETE FROM global_todos WHERE id = $1', [req.params.id]);

    logger.info(`Todo global supprimé (ID: ${req.params.id}) par ${req.user.username}`);

    res.json({ message: 'Todo supprimé avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la suppression du todo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
